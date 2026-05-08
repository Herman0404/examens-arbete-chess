/**
 * Site-wide header component.
 * Displays the logo and links back to the home page.
 */

import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";

export default function Header() {
  return (
    <header>
      <Link to="/" className="header-logo-link">
        <img src={logo} alt="Chessographics logo" className="header-logo" />
      </Link>
    </header>
  );
}
