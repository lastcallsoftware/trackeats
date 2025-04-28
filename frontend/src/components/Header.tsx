import { Image } from '@chakra-ui/react';
import logo from '../assets/trackeats-1280x873.png';

function Header() {
    return (
            <Image className="logo" src={logo} alt="TrackEats logo" />
    );
}

export default Header;
