interface ArcCoordinate {
  x: number; // longitude in degrees
  y: number; // latitude in degrees
}

declare module 'arc' {
  export class GreatCircle {
    constructor(start: ArcCoordinate, end: ArcCoordinate, options?: { name?: string });
    Arc(n: number, options?: { offset?: number }): GreatCircle;
    json(): {
      geometry: {
        type: 'LineString';
        coordinates: [number, number][];
      };
      type: 'Feature';
      properties: {
        name: string;
      };
    };
  }
}