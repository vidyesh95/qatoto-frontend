import Image from "next/image";
import Link from "next/link";

export default function SignIn() {
  return (
    <main className="flex min-h-screen w-screen flex-col">
      <header className="space-y-10 bg-background pt-2 pb-4">
        <Link href={"/sign-in"} className="mx-1 flex size-12 items-center justify-center">
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Navigate back"
            width={24}
            height={24}
          />
        </Link>
        <h1 className="mx-5 text-3xl">Sign in with Password</h1>
      </header>
      <section className="space-y-4 p-4">
        <form action="" className="space-y-4">
          <div className="relative">
            <div className="relative flex h-14 items-center rounded border border-[#6F7979] px-3">
              <label
                htmlFor="email"
                className="absolute -top-2 left-3 bg-white px-1 text-xs text-black"
              >
                Email
              </label>
              <div className="mr-3 flex items-center justify-center">
                <Image
                  src={"/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"}
                  alt={"Email"}
                  width={24}
                  height={24}
                />
              </div>
              <input
                type="email"
                id="email"
                aria-label="Email"
                placeholder="host@domain.com"
                className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
                required
              />
            </div>
            <p className="mt-1 w-full pl-4 text-xs text-[#3F4949]">
              Enter email you have access to
            </p>
          </div>
          <div className="relative">
            <div className="relative flex h-14 items-center rounded border border-[#6F7979] px-3">
              <label
                htmlFor="password"
                className="absolute -top-2 left-3 bg-white px-1 text-xs text-black"
              >
                Password
              </label>
              <div className="mr-3 flex items-center justify-center">
                <Image
                  src={"/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"}
                  alt={"Password"}
                  width={24}
                  height={24}
                />
              </div>
              <input
                type="password"
                id="password"
                aria-label="Password"
                placeholder="secretPassword123$"
                className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-foreground"
                required
              />
              <div className="ml-3 flex cursor-pointer items-center justify-center">
                <Image
                  src={"/icons/visibility_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"}
                  alt={"Show Password"}
                  width={24}
                  height={24}
                />
              </div>
            </div>
            <p className="mt-1 w-full pl-4 text-xs text-[#3F4949]">
              Click Forgot Password? if forgotten
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="remember-me" className="w-full text-sm font-medium">
              Remember me
            </label>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="remember-me"
                className="peer sr-only"
                aria-label="Remember me toggle switch"
              />
              {/* Track */}
              <div className="h-8 w-13 rounded-full border-2 border-[#6F7979] bg-[#DAE4E5] transition-colors duration-200 ease-in-out peer-checked:border-[#00696E] peer-checked:bg-[#00696E]"></div>

              {/* Thumb */}
              <div className="pointer-events-none absolute top-0.75 left-0.75 flex size-6.5 items-center justify-center rounded-full bg-[#6F7979] shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5 peer-checked:bg-white peer-checked:[&>svg.check-icon]:opacity-100 peer-checked:[&>svg.x-icon]:opacity-0">
                {/* X Icon - shown when unchecked */}
                <svg
                  className="x-icon absolute size-4 text-white opacity-100 transition-opacity duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                {/* Checkmark Icon - shown when checked */}
                <svg
                  className="check-icon absolute size-4 text-[#00696E] opacity-0 transition-opacity duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </label>
          </div>
          <button
            type="submit"
            className={
              "border-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#00696E] py-2.5 pr-6 pl-4 text-sm font-medium text-background"
            }
          >
            <Image
              src={"/icons/mail_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"}
              alt={"Sign in with Password"}
              width={18}
              height={18}
            />
            <span>Sign in with Password</span>
          </button>
        </form>
        <p className="text-center text-sm font-medium">
          <Link href={"/forgot-password"} className="cursor-pointer text-[#00696E]">
            Forgot Password?
          </Link>
        </p>
        <div className="flex items-center gap-4 px-4 text-[#BEC8C9]">
          <hr className="flex-1" />
          <span className="text-xs">or continue with</span>
          <hr className="flex-1" />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            type={"button"}
            aria-label="Continue with Google"
            className={
              "border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-[#00696E]"
            }
          >
            <Image
              src={"/icons/google_logo_18x18px.svg"}
              alt={"Continue with Google"}
              width={18}
              height={18}
            />
          </button>
          <button
            type={"button"}
            aria-label="Continue with GitHub"
            className={
              "border-outline flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 pr-4 pl-4 text-sm font-medium text-[#00696E]"
            }
          >
            <Image
              src={"/icons/github_logo_light.svg"}
              alt={"Continue with GitHub"}
              width={18}
              height={18}
            />
          </button>
        </div>
        <p className="space-x-1 text-center text-sm font-medium">
          <span className="text-[#BEC8C9]">Don't have an account?</span>
          <Link href={"/sign-up"} className="cursor-pointer text-[#00696E]">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
