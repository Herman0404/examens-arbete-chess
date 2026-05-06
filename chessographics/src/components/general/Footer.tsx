/**
 * Site-wide footer component.
 * Shows the logo and placeholder links.
 */

import logo from '../../assets/images/logo.png';

export default function Footer() {
  return (
    <footer>
      <img src={logo} alt="Chessographics logo" />
      <div>
        <p>Terms</p>
      </div>
    </footer>
  );
}
