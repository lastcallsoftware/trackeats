import logo from '../assets/lcs3.png';

function Footer() {
    return (
        <section className="footerContainer">
            <img className="lcsLogo" src={logo} alt="LCS Logo" height="60"/>
            <p>Copyright: © 2024 Last Call Software.  All rights reserved.</p>
        </section>
    );
}

export default Footer;
