/**
 * Print layout, as fractions of the print-area width so screen and print agree:
 * the epoch line is ~67% of the print width (≈10.4in on a 15.6in area), and its
 * top edge sits ~14% down the print area (≈2.7in), matching the original's DTG placement.
 */
export const LAYOUT = {
  epochTop: 0.14,
  epochFontSize: 0.0815, // 13 digits of Chivo Bold ≈ 8.2 × font-size wide → ~0.67 of the print width (≈10.4in)
  epochWidth: 0.67,
  utcFontSize: 0.026,
  utcGap: 0.024,
  letterSpacing: 0.005,
};
