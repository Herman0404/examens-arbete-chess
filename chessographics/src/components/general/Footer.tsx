/**
 * Site-wide footer component.
 * Shows the logo and placeholder links.
 */

import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";

export default function Footer() {
  return (
    <footer>
      <Link to="/" className="footer-logo-link">
        <img src={logo} alt="Chessographics logo" className="footer-logo" />
      </Link>
      <nav className="footer-nav">
        <p className="footer-nav-item">Terms</p>
      </nav>
    </footer>
  );
}
