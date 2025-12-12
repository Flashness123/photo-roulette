declare module 'react-native-canvas' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface CanvasRenderingContext2D {
    drawImage(image: any, dx: number, dy: number, dw: number, dh: number): void;
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
    fillRect(x: number, y: number, width: number, height: number): void;
    fillStyle: string;
  }

  export interface ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }

  export default class Canvas extends Component<{
    ref?: (canvas: Canvas | null) => void;
    style?: ViewStyle;
  }> {
    width: number;
    height: number;
    Image: any;
    getContext(contextType: '2d'): CanvasRenderingContext2D | null;
  }
}
