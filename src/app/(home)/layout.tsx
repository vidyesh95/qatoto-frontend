import React from "react";
import Navbar from "@/components/home/navbar";
import Sidebar from "@/components/home/sidebar";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    return (
        <div>
            <Navbar />
            <div className="flex">
                <Sidebar/>
                {children}
            </div>
        </div>
    );
};

export default Layout;