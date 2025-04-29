"use server";

import { auth } from "~/server/auth";
import { signout } from "../actions/auth";
import { db } from "~/server/db";
import UserMenu from "~/components/dashboard/UserMenu";
import CreateRoom from "~/components/dashboard/CreateRoom";
import RoomsView from "~/components/dashboard/RoomsView";
import { FiClock, FiUsers, FiLock } from "react-icons/fi";

export default async function Page() {
  const session = await auth();

  const user = await db.user.findUniqueOrThrow({
    where: {
      id: session?.user.id,
    },
    include: {
      ownedRooms: true,
      roomInvites: {
        include: {
          room: true,
        },
      },
    },
  });

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Sidebar */}
      <div className="flex h-screen w-72 flex-col border-r border-indigo-100 bg-white shadow-lg rounded-r-3xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-br-3xl">
          <UserMenu email={user.email} />
        </div>
        <div className="p-6">
          <h3 className="text-sm font-semibold text-indigo-800 mb-4 uppercase tracking-wider">Navegación</h3>
          <div className="space-y-3">
            <button className="flex items-center w-full p-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all">
              <FiClock className="mr-3 h-5 w-5" />
              <span className="font-medium">Recientes</span>
            </button>
            <button className="flex items-center w-full p-3 rounded-xl text-gray-600 hover:bg-indigo-50 transition-all">
              <FiUsers className="mr-3 h-5 w-5" />
              <span className="font-medium">Compartidos</span>
            </button>
            <button className="flex items-center w-full p-3 rounded-xl text-gray-600 hover:bg-indigo-50 transition-all">
              <FiLock className="mr-3 h-5 w-5" />
              <span className="font-medium">Privados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-screen w-full flex-col">
        {/* Header */}
        <div className="flex h-20 items-center justify-between border-b border-indigo-100 bg-white px-8 shadow-md rounded-bl-3xl">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Figma Clone
            </h1>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
              Bienvenido, {user.email?.split('@')[0]}
            </span>
          </div>

          <div className="flex space-x-4">
            <button className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium">
              Tutoriales
            </button>
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-opacity text-sm font-medium">
              Invitar equipo
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-bold text-indigo-800">Tus proyectos</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-sm">
                Todos
              </button>
              <button className="px-3 py-1 rounded-lg text-gray-500 text-sm">
                Recientes
              </button>
              <button className="px-3 py-1 rounded-lg text-gray-500 text-sm">
                Compartidos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <CreateRoom />
            
            <div className="rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 shadow-lg text-white flex flex-col justify-between min-h-[200px] transform transition-transform hover:scale-[1.02]">
              <div>
                <h3 className="text-xl font-bold mb-2">Plantillas Premium</h3>
                <p className="text-purple-100">Accede a plantillas profesionales para acelerar tu trabajo</p>
              </div>
              <button className="mt-4 self-start px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors">
                Explorar plantillas
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-lg hover:shadow-xl transition-shadow border border-indigo-100">
              <RoomsView
                ownedRooms={user.ownedRooms}
                roomInvites={user.roomInvites.map((x) => x.room)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}