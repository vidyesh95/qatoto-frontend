import Image from "next/image";
import Link from "next/link";

export default function SignIn() {
  return (
    <main className="min-h-screen w-screen flex flex-col">
      <header className="bg-background space-y-10 pt-2 pb-4">
        <Link href={"/sign-in"} className="mx-1 w-12 h-12 flex items-center justify-center">
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Navigate back"
            width={24}
            height={24}
          />
        </Link>
        <p className="mx-5 text-3xl">Sign in with Password</p>
      </header>
      <section className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="remember-me" className="w-full font-medium text-sm">
            Remember me
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="remember-me" 
              className="sr-only peer" 
              aria-label="Remember me toggle switch"
            />
            {/* Track */}
            <div className="w-13 h-8 rounded-full border-2 border-[#6F7979] bg-[#DAE4E5] peer-checked:border-[#00696E] peer-checked:bg-[#00696E] transition-colors duration-200 ease-in-out"></div>
            
            {/* Thumb */}
            <div className="absolute top-0.75 left-0.75 h-6.5 w-6.5 rounded-full bg-[#6F7979] peer-checked:bg-white transition-transform duration-200 ease-in-out peer-checked:translate-x-5 flex items-center justify-center pointer-events-none shadow-sm peer-checked:[&>svg.x-icon]:opacity-0 peer-checked:[&>svg.check-icon]:opacity-100">
              {/* X Icon - shown when unchecked */}
              <svg 
                className="w-4 h-4 text-white absolute transition-opacity duration-200 opacity-100 x-icon"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {/* Checkmark Icon - shown when checked */}
              <svg 
                className="w-4 h-4 text-[#00696E] absolute transition-opacity duration-200 opacity-0 check-icon"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </label>
        </div>
        <button type={"button"} className={"w-full justify-center items-center text-sm font-medium bg-[#00696E] text-background flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"}>
          <Image
            src={"/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
            alt={"Sign in with Password"}
            width={18}
            height={18}
          />
          <span>Sign in with Password</span>
        </button>
        <p className="font-medium text-sm text-center text-[#00696E] cursor-pointer">Forgot Password?</p>
        <div className="px-4 flex items-center gap-4 text-[#BEC8C9]">
          <hr className="flex-1"/>
          <span className="text-xs">or continue with</span>
          <hr className="flex-1"/>
        </div>
        <div className="flex gap-4 justify-center items-center">
          <button type={"button"} className={"w-fit flex gap-2 justify-center items-center text-sm font-medium text-[#00696E] border border-outline rounded-full pl-4 pr-4 py-2.5 cursor-pointer"}>
            <Image
              src={"/icons/google_logo_18x18px.svg"}
              alt={"Continue with Google"}
              width={18}
              height={18}
            />
          </button>
          <button type={"button"} className={"w-fit flex gap-2 justify-center items-center text-sm font-medium text-[#00696E] border border-outline rounded-full pl-4 pr-4 py-2.5 cursor-pointer"}>
            <Image
              src={"/icons/apple_logo_18x18px.svg"}
              alt={"Continue with Apple"}
              width={18}
              height={18}
            />
          </button>
        </div>
        <p className="text-sm font-medium text-center space-x-1">
          <span className="text-[#BEC8C9]">Don't have an account?</span>
          <span className="text-[#00696E] cursor-pointer">Sign up</span>
        </p>
      </section>
    </main>
  )
}