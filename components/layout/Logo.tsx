import Link from "next/link"
import { clinic } from "@/config/clinic"

export const Logo = () => {
  const [firstWord, ...rest] = clinic.name.split(" ")
  const secondLine = rest.join(" ") || firstWord

  return (
    <Link
      href="/"
      className="flex items-center gap-2 sm:gap-3 group hover:opacity-80 transition-opacity"
    >
      {clinic.logoSrc && clinic.key === "tooth" ? (
        <div className="flex items-center">
          <div className="bg-white rounded-full border border-black/5 shadow-sm px-3 py-1 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clinic.logoSrc}
              alt={clinic.name}
              className="h-8 sm:h-10 w-auto"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Stylized Molar Tooth Icon - Interlocking Green and Blue */}
          <div
            className="relative flex-shrink-0"
            style={{ width: "40px", height: "48px" }}
          >
            <svg
              viewBox="-8 -8 116 136"
              width="40"
              height="48"
              className="block"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M50 10 
               C40 10, 28 14, 20 22 
               C16 26, 13 32, 12 38 
               C11 44, 11 50, 12 56 
               C13 62, 16 68, 20 73 
               C24 78, 30 82, 37 85 
               C40 86, 43 86, 45 86 
               C43 88, 40 90, 37 92 
               C34 94, 30 96, 26 97 
               C22 98, 18 98, 14 97 
               C12 96, 10 94, 9 92 
               C8 90, 8 88, 9 86 
               C10 84, 12 82, 14 81 
               C18 79, 22 77, 26 75 
               C30 73, 34 71, 38 69 
               C40 68, 42 67, 44 66 
               C46 65, 48 64, 50 63 
               L50 10 Z"
                fill="#22C55E"
              />
              <path
                d="M50 10 
               C60 10, 72 14, 80 22 
               C84 26, 87 32, 88 38 
               C89 44, 89 50, 88 56 
               C87 62, 84 68, 80 73 
               C76 78, 70 82, 63 85 
               C60 86, 57 86, 55 86 
               C57 88, 60 90, 63 92 
               C66 94, 70 96, 74 97 
               C78 98, 82 98, 86 97 
               C88 96, 90 94, 91 92 
               C92 90, 92 88, 91 86 
               C90 84, 88 82, 86 81 
               C82 79, 78 77, 74 75 
               C70 73, 66 71, 62 69 
               C60 68, 58 67, 56 66 
               C54 65, 52 64, 50 63 
               L50 10 Z"
                fill="#1E40AF"
              />
            </svg>
          </div>

          {/* Text - Clinic name */}
          <div className="flex flex-col">
            <span className="text-[#1E40AF] font-bold text-lg sm:text-xl leading-tight tracking-tight">
              {firstWord.toUpperCase()}
            </span>
            <span className="bg-[#1E40AF] text-white px-2 py-0.5 font-bold text-lg sm:text-xl leading-tight tracking-tight rounded-sm">
              {secondLine.toUpperCase()}
            </span>
          </div>
        </>
      )}
    </Link>
  )
}
