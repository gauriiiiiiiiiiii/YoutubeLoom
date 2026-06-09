/**
 * Video Compositor - Composites webcam overlay onto screen recording using Canvas
 */

export interface CompositorOptions {
  webcamPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  webcamSize?: number; // Percentage of screen width (default 20%)
  webcamBorderRadius?: number; // Border radius in pixels
  frameRate?: number; // Target frame rate (default 15fps for performance)
}

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private compositeStream: MediaStream | null = null;
  private animationId: number | null = null;
  private options: Required<CompositorOptions>;

  constructor(options: CompositorOptions = {}) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    this.options = {
      webcamPosition: options.webcamPosition || 'bottom-right',
      webcamSize: options.webcamSize || 20,
      webcamBorderRadius: options.webcamBorderRadius || 12,
      frameRate: options.frameRate || 15,
    };
  }

  /**
   * Start compositing screen + webcam
   */
  async start(
    screenStream: MediaStream,
    webcamStream: MediaStream
  ): Promise<MediaStream> {
    this.screenStream = screenStream;
    this.webcamStream = webcamStream;

    // Get screen video track settings
    const screenTrack = screenStream.getVideoTracks()[0];
    const settings = screenTrack.getSettings();

    // Set canvas size to match screen
    this.canvas.width = settings.width || 1920;
    this.canvas.height = settings.height || 1080;

    // Create video elements for rendering
    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    screenVideo.srcObject = screenStream;
    webcamVideo.srcObject = webcamStream;

    screenVideo.muted = true;
    webcamVideo.muted = true;

    await screenVideo.play();
    await webcamVideo.play();

    // Calculate webcam dimensions and position
    const webcamWidth = (this.canvas.width * this.options.webcamSize) / 100;
    const webcamHeight = (webcamWidth * 9) / 16; // Assume 16:9 aspect ratio
    const padding = 20;

    const webcamPos = this.getWebcamPosition(
      this.canvas.width,
      this.canvas.height,
      webcamWidth,
      webcamHeight,
      padding
    );

    // Start compositing loop
    const frameInterval = 1000 / this.options.frameRate;
    let lastFrameTime = 0;

    const composite = (timestamp: number) => {
      if (timestamp - lastFrameTime >= frameInterval) {
        // Draw screen
        this.ctx.drawImage(screenVideo, 0, 0, this.canvas.width, this.canvas.height);

        // Draw webcam overlay with rounded corners
        this.ctx.save();
        this.roundRect(
          this.ctx,
          webcamPos.x,
          webcamPos.y,
          webcamWidth,
          webcamHeight,
          this.options.webcamBorderRadius
        );
        this.ctx.clip();

        this.ctx.drawImage(webcamVideo, webcamPos.x, webcamPos.y, webcamWidth, webcamHeight);

        // Add border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();

        lastFrameTime = timestamp;
      }

      this.animationId = requestAnimationFrame(composite);
    };

    this.animationId = requestAnimationFrame(composite);

    // Capture canvas stream
    this.compositeStream = this.canvas.captureStream(this.options.frameRate);

    // Copy audio tracks from screen stream (if any)
    const audioTracks = screenStream.getAudioTracks();
    audioTracks.forEach((track) => {
      this.compositeStream!.addTrack(track);
    });

    return this.compositeStream;
  }

  /**
   * Update webcam position
   */
  updatePosition(position: CompositorOptions['webcamPosition']): void {
    this.options.webcamPosition = position || 'bottom-right';
  }

  /**
   * Update webcam size
   */
  updateSize(size: number): void {
    this.options.webcamSize = Math.max(10, Math.min(50, size)); // Clamp between 10-50%
  }

  /**
   * Stop compositing
   */
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.compositeStream) {
      this.compositeStream.getTracks().forEach((track) => track.stop());
      this.compositeStream = null;
    }

    this.screenStream = null;
    this.webcamStream = null;
  }

  /**
   * Get webcam position based on setting
   */
  private getWebcamPosition(
    canvasWidth: number,
    canvasHeight: number,
    webcamWidth: number,
    webcamHeight: number,
    padding: number
  ): { x: number; y: number } {
    switch (this.options.webcamPosition) {
      case 'top-left':
        return { x: padding, y: padding };
      case 'top-right':
        return { x: canvasWidth - webcamWidth - padding, y: padding };
      case 'bottom-left':
        return { x: padding, y: canvasHeight - webcamHeight - padding };
      case 'bottom-right':
      default:
        return {
          x: canvasWidth - webcamWidth - padding,
          y: canvasHeight - webcamHeight - padding,
        };
    }
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Get canvas for debugging/preview
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
