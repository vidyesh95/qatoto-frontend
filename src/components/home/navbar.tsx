import Link from 'next/link'
import Image from 'next/image'
import {Bell, CircleUserRound, Menu, Search} from "lucide-react";
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
                    <div className={"p-2 text-primary-foreground"}>
                        <Menu/>
                    </div>
                    <Link href="/" className="text-3xl font-serif font-medium text-[#00696E]">
                        Qatoto
                    </Link>
                </div>

                <form action="/search" method="get" className={"hidden md:flex"}>
                    <input type="search" id="search-query" name="q" placeholder="Search..."/>
                    <button type="submit"></button>
                </form>

                {/* Desktop ▸ link group */}
                <div className="hidden items-center space-x-2 md:flex text-black">
                    <div className={"border border-primary rounded-full p-1.75"}>
                        <Bell/>
                    </div>
                    <div className={"border border-primary rounded-full p-1.75"}>
                        <Image src={"/icons/translate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"} alt={"translate"} width={24}
                               height={24}/>
                    </div>
                    <Link href="/signin">
                        <button className="flex gap-2 text-[#1DBDC5] border border-primary rounded-full px-2 py-1.75">
                            <CircleUserRound className={"text-foreground"}/>
                            Sign in
                        </button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}