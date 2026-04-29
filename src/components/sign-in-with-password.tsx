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
          <label htmlFor="remember-me" className="font-medium text-sm ">Remember me</label>
          <input type="checkbox" id="remember-me" aria-label="Remember me toggle switch" />
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