/**
 * Site-wide header component.
 * Displays the logo and links back to the home page.
 */

import { Link } from 'react-router-dom';
import logo from '../../assets/images/logo.png';

export default function Header() {
  return (
    <header>
      {/* Clicking the logo navigates back to the home/search page */}
      <Link to="/">
        <img src={logo} alt="Chessographics logo" />
      </Link>
    </header>
  );
}
