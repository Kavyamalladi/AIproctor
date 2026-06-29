// // src/pages/NotFound.jsx

// import React from "react";

// function NotFound() {
//   return (
//     <div className="min-h-screen flex items-center justify-center flex-col bg-gray-100">
//       <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
//       <p className="text-lg text-gray-600">Page Not Found</p>
//     </div>
//   );
// }

// export default NotFound;


import React from "react";
import { motion } from "framer-motion";
import { TbError404 } from "react-icons/tb";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 flex flex-col items-center justify-center relative px-6">

      {/* Floating Blurred Circles */}
      <div className="absolute w-72 h-72 bg-purple-600 rounded-full blur-3xl opacity-20 -top-10 -left-10 animate-pulse"></div>
      <div className="absolute w-72 h-72 bg-blue-600 rounded-full blur-3xl opacity-20 -bottom-10 -right-10 animate-pulse"></div>

      {/* Animated 404 Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <TbError404 className="text-white text-[120px] drop-shadow-xl animate-bounce" />
      </motion.div>

      {/* Heading */}
      <motion.h1
        className="text-white text-5xl md:text-6xl font-bold mt-4 tracking-wide"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Page Not Found
      </motion.h1>

      {/* Description */}
      <motion.p
        className="text-gray-300 text-center mt-3 text-lg max-w-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        The page you're looking for doesn’t exist or might have been removed.
      </motion.p>

      {/* Button */}
      <motion.button
        onClick={() => navigate("/")}
        className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-xl shadow-lg hover:bg-gray-200 transition-all duration-300"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        Go Back Home
      </motion.button>

      {/* Animated Bottom Line */}
      <motion.div
        className="w-40 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-6"
        initial={{ width: 0 }}
        animate={{ width: 160 }}
        transition={{ delay: 1, duration: 0.7 }}
      />
    </div>
  );
}

export default NotFound;
