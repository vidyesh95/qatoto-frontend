import Link from 'next/link'
import Image from 'next/image'
// import {Button} from '@/components/ui/button'
// import {
//     Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
// } from '@/components/ui/sheet'


export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-white">
            <div
                className="relative mx-auto flex items-center justify-center px-4 py-2.5 md:justify-between">
                {/* Mobile ▸ menu button (hidden on md+) */}
                {/*<Sheet>*/}
                {/*    <SheetTrigger className="absolute left-4 md:hidden">*/}
                {/*        <Image*/}
                {/*            src="/menu_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg"*/}
                {/*            alt="menu"*/}
                {/*            width={24}*/}
                {/*            height={24}*/}
                {/*        />*/}
                {/*    </SheetTrigger>*/}

                {/*    <SheetContent side="left">*/}
                {/*        <SheetHeader className="space-y-4">*/}
                {/*            {links.map(({id, label}) => (*/}
                {/*                <SheetTitle key={id}>*/}
                {/*                    <SheetClose asChild>*/}
                {/*                        <Link*/}
                {/*                            href={{pathname: '/', hash: id}}*/}
                {/*                            scroll*/}
                {/*                            className="block"*/}
                {/*                        >*/}
                {/*                            {label}*/}
                {/*                        </Link>*/}
                {/*                    </SheetClose>*/}
                {/*                </SheetTitle>*/}
                {/*            ))}*/}
                {/*            <SheetDescription>*/}
                {/*                <SheetClose asChild>*/}
                {/*                    <Link href="/signin">*/}
                {/*                        <Button className="btn-primary w-full">*/}
                {/*                            Sign in*/}
                {/*                        </Button>*/}
                {/*                    </Link>*/}
                {/*                </SheetClose>*/}
                {/*            </SheetDescription>*/}
                {/*        </SheetHeader>*/}
                {/*    </SheetContent>*/}
                {/*</Sheet>*/}

                {/* Brand */}
                <div className={"flex items-center gap-2.5"}>
                    <button type={"button"} className={"p-2 text-primary-foreground cursor-pointer"}>
                        <Image
                            src={"/icons/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                        />
                    </button>
                    <Link href="/" className="text-3xl font-serif font-medium text-[#00696E]">
                        Qatoto
                    </Link>
                </div>

                <div className={"hidden md:flex w-sm items-center gap-2 justify-end"}>
                    <form action="/search" method="get"
                          className={"relative flex items-center border border-primary rounded-full"}>
                        <input type="search" id="search-query" name="query" placeholder="Search" className={"py-2 rounded-l-full pl-4 hover:pl-10"}/>
                        <Image
                            src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                            className={"hidden hover:visible absolute left-2 top-2 "}
                        />
                        <button type="submit" className={"bg-primary rounded-r-full py-2 pl-2 pr-4 cursor-pointer"}>
                            <Image
                                src={"/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                                alt={"translate"}
                                width={24}
                                height={24}
                            />
                        </button>
                    </form>
                    <button type={"button"} className={"bg-primary p-2 rounded-full cursor-pointer"}>
                        <Image
                            src={"/icons/mic_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                        />
                    </button>
                </div>

                <div className="hidden items-center space-x-2 md:flex text-black">
                    <button type={"button"} className={"border border-primary rounded-full p-1.75 cursor-pointer"}>
                        <Image
                            src={"/icons/notifications_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                        />
                    </button>
                    <button type={"button"} className={"border border-primary rounded-full p-1.75 cursor-pointer"}>
                        <Image
                            src={"/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                        />
                    </button>
                    <button type={"button"}
                            className="flex gap-2 text-[#1DBDC5] border border-primary rounded-full px-2 py-1.75 cursor-pointer">
                        <Image
                            src={"/icons/account_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
                            alt={"translate"}
                            width={24}
                            height={24}
                        />
                        Sign in
                    </button>
                </div>
            </div>
        </nav>
    )
}