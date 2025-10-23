import React from "react";
import Navbar from "@/components/home/navbar";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    return (
        <div>
            <Navbar />
            {children}
        </div>
    );
};

export default Layout;