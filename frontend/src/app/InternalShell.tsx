import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, ShoppingCart } from "lucide-react";
import { supabase } from "../shared/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PersonnelContext } from "@/shared/personnel-context";
import { useAuthContext } from "@/shared/use-auth-context";

export default function InternalShell() {
  const location = useLocation();
  const { personnelUser: personnel } = useAuthContext();

  const menuItems = [
    {
      label: "POS",
      path: "/internal/pos",
      roles: ["kasir", "manager", "admin"],
      icon: ShoppingCart,
    },
  ].filter((item) => personnel && item.roles.includes(personnel.role));

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/internal/login");
    }
  };

  return (
    <PersonnelContext.Provider value={personnel}>
      <SidebarProvider>
      <Sidebar>
        <SidebarHeader />
        <SidebarContent>
          <SidebarGroup />
            <SidebarMenuButton>Dewa</SidebarMenuButton>
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
        <main>
        <SidebarInset></SidebarInset>
        <SidebarTrigger />
        </main>
    </SidebarProvider>
    </PersonnelContext.Provider>
  );
}



