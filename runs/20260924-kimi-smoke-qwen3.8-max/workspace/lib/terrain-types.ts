/**
 * Shared Terrain type (no runtime imports) so pure rendering code can
 * reference it without pulling in server-only modules.
 */
export type Terrain = {
  grid: Float32Array; // n x n elevations in metres, row-major, north → south
  n: number;
  min: number;
  max: number;
  /** marker position in grid space, 0..1 */
  markerU: number;
  markerV: number;
  pointElev: number;
  /** east-west ground width of the sampled area in metres */
  spanMeters: number;
  zoom: number;
};
