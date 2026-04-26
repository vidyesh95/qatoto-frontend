import Image from "next/image";

export default function SignIn() {
  return (
    <main className="min-h-screen w-screen flex flex-col">
      <header className="bg-background">
        <div className="px-4 py-5">
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Navigate back"
            width={24}
            height={24}
          />
        </div>
        <p className="px-5 pt-5 pb-4 text-3xl">Sign in</p>
      </header>
      <section className="p-4 space-y-4">
        <button type={"button"} className={"w-full justify-center text-sm font-medium text-[#00696E] flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"}>
          <Image
            src={"/icons/google_logo_18x18px.svg"}
            alt={"Continue with Google"}
            width={18}
            height={18}
          />
          <span>Continue with Google</span>
        </button>
        <button type={"button"} className={"w-full justify-center text-sm font-medium text-[#00696E] flex gap-2 border border-outline rounded-full pl-4 pr-6 py-2.5 cursor-pointer"}>
          <Image
            src={"/icons/apple_logo_18x18px.svg"}
            alt={"Continue with Apple"}
            width={18}
            height={18}
          />
          <span>Continue with Apple</span>
        </button>
        <div className="p-4 flex items-center gap-4 text-muted-foreground">
          <hr className="flex-1"/>
          <span className="text-xs">or</span>
          <hr className="flex-1"/>
        </div>
      </section>
    </main>
  )
}