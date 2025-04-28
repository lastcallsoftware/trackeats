import logo from '../assets/lcs-1280x501.png';
import { Image } from '@chakra-ui/react';

function Footer() {
    return (
        <section className="footerContainer">
            <Image className="lcsLogo" src={logo} alt="LCS Logo" height="60px"/>
            <p>Copyright: © 2024 Last Call Software.  All rights reserved.</p>
        </section>
    );
}

export default Footer;
