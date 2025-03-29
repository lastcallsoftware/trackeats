import { Image } from '@chakra-ui/react';
import logo from '../assets/trackeats.png';

function Header() {
    return (
            <Image className="logo" src={logo} alt="TrackEats logo" />
    );
}

export default Header;
