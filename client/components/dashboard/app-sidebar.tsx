"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoIcon } from "@/components/dashboard/logo";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/dashboard/nav-group";
import { footerNavLinks, navGroups } from "@/components/dashboard/app-shared";
import { LatestChange } from "@/components/dashboard/latest-change";
import { IconPlus, IconSearch, IconMessageCircle } from "@tabler/icons-react";
import { useUnreadCount } from "@/features/chat/hooks";

export function AppSidebar() {
	const pathname = usePathname();
	const { data: unreadData } = useUnreadCount();
	const unreadCount = unreadData?.count ?? 0;

	const isActive = (path?: string) => {
		if (!path) return false;
		return pathname === path;
	};

	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader className="h-14 justify-center">
				<SidebarMenuButton render={<Link href="/" />}>
					<LogoIcon />
					<span className="font-medium">Nodeline</span>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenuItem className="flex items-center gap-2">
						<SidebarMenuButton
							className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
							tooltip="Buat Baru"
						>
							<IconPlus />
							<span>Percakapan Baru</span>
						</SidebarMenuButton>
						<Button
							aria-label="Cari percakapan"
							className="size-8 group-data-[collapsible=icon]:opacity-0"
							size="icon"
							variant="outline"
						>
							<IconSearch />
							<span className="sr-only">Cari percakapan</span>
						</Button>
					</SidebarMenuItem>
				</SidebarGroup>
				{navGroups.map((group, index) => {
					// Render Chat item with unread badge
					if (group.label === "Layanan") {
						return (
							<SidebarGroup key={`sidebar-group-${index}`}>
								<SidebarGroupLabel>Layanan</SidebarGroupLabel>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											isActive={pathname === "/dashboard/chat"}
											render={<Link href="/dashboard/chat" />}
										>
											<div className="relative">
												<IconMessageCircle className="size-4" />
												{unreadCount > 0 && (
													<span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
														{unreadCount > 99 ? "99+" : unreadCount}
													</span>
												)}
											</div>
											<span>Chat</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroup>
						);
					}
					return <NavGroup key={`sidebar-group-${index}`} {...group} />;
				})}
			</SidebarContent>
			<SidebarFooter>
				<LatestChange />
				<SidebarMenu className="mt-2">
					{footerNavLinks.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								className="text-muted-foreground"
								isActive={isActive(item.path)}
								size="sm"
								render={item.path ? <Link href={item.path} /> : undefined}
							>
								{item.icon}
								<span>{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
