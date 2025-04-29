"use client";

import { useEffect, useRef, useState } from "react";
import UserAvatar from "../sidebars/UserAvatar";
import { BiChevronDown } from "react-icons/bi";
import { signout } from "~/app/actions/auth";
import { GoSignOut } from "react-icons/go";
import { FiSettings, FiUser, FiHelpCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function UserMenu({ email }: { email: string | null }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm px-4 py-3 transition-all duration-200 hover:bg-opacity-30 border border-white border-opacity-30"
      >
        <div className="flex items-center gap-3">
          <UserAvatar name={email ?? "Anonymous"} />
          <div>
            <h2 className="text-sm font-medium text-white">{email?.split('@')[0]}</h2>
            <p className="text-xs text-indigo-100">{email}</p>
          </div>
        </div>
        <BiChevronDown className={`h-5 w-5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 flex min-w-[240px] flex-col rounded-xl bg-white p-2 shadow-xl border border-indigo-100 z-50"
            ref={menuRef}
          >
            <div className="p-3 border-b border-indigo-100">
              <p className="text-xs text-gray-500">Conectado como</p>
              <p className="font-medium text-gray-800">{email}</p>
            </div>
            
            <div className="p-1">
              <button className="flex w-full items-center gap-3 rounded-lg p-3 text-gray-700 transition-colors duration-200 hover:bg-indigo-50">
                <FiUser className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium">Mi perfil</span>
              </button>
              
              <button className="flex w-full items-center gap-3 rounded-lg p-3 text-gray-700 transition-colors duration-200 hover:bg-indigo-50">
                <FiSettings className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium">Configuración</span>
              </button>
              
              <button className="flex w-full items-center gap-3 rounded-lg p-3 text-gray-700 transition-colors duration-200 hover:bg-indigo-50">
                <FiHelpCircle className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium">Ayuda y soporte</span>
              </button>
            </div>
            
            <div className="p-1 border-t border-indigo-100 mt-1">
              <button
                onClick={signout}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-red-600 transition-colors duration-200 hover:bg-red-50"
              >
                <GoSignOut className="h-5 w-5" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}