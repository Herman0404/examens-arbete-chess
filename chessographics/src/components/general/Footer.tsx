import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";

export default function Footer() {
  return (
    <footer>
      <Link to="/" className="footer-logo-link">
        <img src={logo} alt="Chessographics logo" className="footer-logo" />
      </Link>
    </footer>
  );
}
