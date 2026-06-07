import { NavLink } from 'react-router-dom';
import { assets } from '../assets/assets';

const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="px-6 md:px-10">
      <div className="grid md:grid-cols-[3fr_1fr_1fr] gap-12 my-10 mt-24 text-sm items-start">
        {/* Left Section */}
        <div className="flex items-start gap-4">
          <img className="w-28 mt-1" src={assets.logo} alt="CareLink Logo" />
          <p className="text-gray-600 leading-6 md:max-w-[75%]">
            <strong>CareLink – Effortless Healthcare Scheduling</strong>
            <br />Patients can instantly book appointments with trusted doctors—from routine check-ups to specialist care—in just a few clicks. Our smart reminders keep appointments on track, while real-time updates ensure seamless coordination. Designed for modern healthcare, we save time for both patients and providers.
          </p>
        </div>

        {/* Middle Section */}
        <div>
          <p className="text-lg font-semibold mb-4">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>
              <NavLink to="/" onClick={scrollToTop} className="hover:text-primary cursor-pointer transition-colors">
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" onClick={scrollToTop} className="hover:text-primary cursor-pointer transition-colors">
                About Us
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" onClick={scrollToTop} className="hover:text-primary cursor-pointer transition-colors">
                Contact Us
              </NavLink>
            </li>
            <li className="cursor-default">Privacy Policy</li>
          </ul>
        </div>

        {/* Right Section */}
        <div>
          <p className="text-lg font-semibold mb-4">GET IN TOUCH</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>+92-3067571707</li>
            <li>hamzaweb3565@gmail.com</li>
          </ul>
        </div>
      </div>

      {/* Bottom Footer */}
      <hr className="border-gray-300" />
      <p className="py-4 text-sm text-center text-gray-600">
        © 2025 CareLink.in — All Rights Reserved.
      </p>
    </div>
  );
};

export default Footer;
