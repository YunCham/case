"use client";

import { Room } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { FiEdit2, FiTrash2, FiClock, FiStar } from "react-icons/fi";
import { deleteRoom, updateRoomTitle } from "~/app/actions/rooms";
import { motion } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";

export default function RoomsView({
  ownedRooms,
  roomInvites,
}: {
  ownedRooms: Room[];
  roomInvites: Room[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState("owned");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setTitle(currentTitle);
  };

  const saveTitle = async (id: string) => {
    await updateRoomTitle(title, id);
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveTitle(id);
    }
  };

  const confirmDelete = async () => {
    if (roomToDelete) {
      await deleteRoom(roomToDelete);
      setShowConfirmationModal(false);
      setRoomToDelete(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setRoomToDelete(id);
    setShowConfirmationModal(true);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <div className="mb-6 flex border-b border-indigo-100">
        <button
          onClick={() => setActiveTab("owned")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "owned"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mis proyectos ({ownedRooms.length})
        </button>
        <button
          onClick={() => setActiveTab("shared")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "shared"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Compartidos conmigo ({roomInvites.length})
        </button>
      </div>

      {activeTab === "owned" && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {ownedRooms.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">No tienes proyectos creados aún</p>
          ) : (
            ownedRooms.map((room) => (
              <motion.div
                key={room.id}
                variants={item}
                whileHover={{ y: -5 }}
                className="group relative rounded-xl bg-white border border-indigo-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingId === room.id ? (
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          onBlur={() => saveTitle(room.id)}
                          onKeyDown={(e) => handleKeyDown(e, room.id)}
                          className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <Link
                          href={`/dashboard/${room.id}`}
                          className="block font-medium text-gray-800 hover:text-indigo-600 transition-colors"
                        >
                          {room.title || "Untitled"}
                        </Link>
                      )}
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <FiClock className="mr-1 h-3 w-3" />
                        <span>
                          {new Date(room.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(room.id, room.title || "")}
                        className="rounded-full p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(room.id)}
                        className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-bold"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                      <FiStar className="mr-1 h-3 w-3" />
                      Favorito
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {activeTab === "shared" && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {roomInvites.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">No tienes proyectos compartidos contigo</p>
          ) : (
            roomInvites.map((room) => (
              <motion.div
                key={room.id}
                variants={item}
                whileHover={{ y: -5 }}
                className="group relative rounded-xl bg-white border border-indigo-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="p-5">
                  <Link
                    href={`/dashboard/${room.id}`}
                    className="block font-medium text-gray-800 hover:text-indigo-600 transition-colors"
                  >
                    {room.title || "Untitled"}
                  </Link>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <FiClock className="mr-1 h-3 w-3" />
                    <span>
                      {new Date(room.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {[...Array(2)].map((_, i) => (
                        <div
                          key={i}
                          className="h-6 w-6 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[10px] text-purple-600 font-bold"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600">
                      Compartido
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={confirmDelete}
        message="¿Estás seguro de que quieres eliminar esta sala?"
      />
    </div>
  );
}