"use client";

import { useState } from "react";
import { SlPencil } from "react-icons/sl";
import { createRoom } from "~/app/actions/rooms";
import { motion } from "framer-motion";

export default function CreateRoom() {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => createRoom()}
      className="flex h-full cursor-pointer select-none items-center justify-between rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 shadow-lg transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-3">
          <SlPencil className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-bold text-white text-lg">Nuevo diseño</p>
          <p className="text-indigo-100">Crea un proyecto desde cero</p>
        </div>
      </div>
      
      <motion.div 
        animate={{ x: hover ? [0, 5, 0] : 0 }}
        transition={{ repeat: hover ? Infinity : 0, duration: 1 }}
        className="bg-white bg-opacity-20 rounded-full p-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </motion.div>
    </motion.div>
  );
}