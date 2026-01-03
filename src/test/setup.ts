import '@testing-library/jest-dom';

// Mock WebGL context for Three.js tests
const mockWebGLContext = {
  getExtension: () => null,
  getParameter: () => 0,
  createBuffer: () => ({}),
  createProgram: () => ({}),
  createShader: () => ({}),
  shaderSource: () => {},
  compileShader: () => {},
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  useProgram: () => {},
  getUniformLocation: () => ({}),
  getAttribLocation: () => 0,
  enableVertexAttribArray: () => {},
  vertexAttribPointer: () => {},
  bindBuffer: () => {},
  bufferData: () => {},
  viewport: () => {},
  clearColor: () => {},
  clear: () => {},
  enable: () => {},
  disable: () => {},
  depthFunc: () => {},
  blendFunc: () => {},
  createTexture: () => ({}),
  bindTexture: () => {},
  texParameteri: () => {},
  texImage2D: () => {},
  activeTexture: () => {},
  uniform1i: () => {},
  uniform1f: () => {},
  uniform2f: () => {},
  uniform3f: () => {},
  uniform4f: () => {},
  uniformMatrix4fv: () => {},
  drawArrays: () => {},
  drawElements: () => {},
};

// Store original getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;

// Override getContext for WebGL mocking
HTMLCanvasElement.prototype.getContext = function (
  contextType: string,
  ...args: unknown[]
): RenderingContext | null {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext as unknown as WebGLRenderingContext;
  }
  // Fall back to original for other contexts
  return originalGetContext.call(this, contextType as '2d', ...args as [CanvasRenderingContext2DSettings?]);
};

// Suppress console errors during tests (optional)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (args[0]?.includes?.('Warning:')) return;
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });
