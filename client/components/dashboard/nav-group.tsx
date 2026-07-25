"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup } from "@/components/dashboard/app-shared";
import { IconChevronRight } from "@tabler/icons-react";
import { useRoutePrefetch } from "@/lib/use-route-prefetch";

export function NavGroup({ label, items }: SidebarNavGroup) {
	const pathname = usePathname();
	const prefetchRoute = useRoutePrefetch();

	const isActive = (path?: string) => {
		if (!path) return false;
		return pathname === path;
	};

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => {
					const itemActive = isActive(item.path);
					const hasActiveSub = item.subItems?.some((sub) => isActive(sub.path));
					return (
						<Collapsible
							className="group/collapsible"
							defaultOpen={itemActive || !!hasActiveSub}
							key={`${item.title}-${pathname}`}
							render={<SidebarMenuItem />}
						>
							{item.subItems?.length ? (
								<>
									<CollapsibleTrigger
										render={
											<SidebarMenuButton isActive={itemActive} />
										}
									>
										{item.icon}
										<span>{item.title}</span>
										<IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.subItems.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton
														isActive={isActive(subItem.path)}
														render={subItem.path ? <Link href={subItem.path} /> : undefined}
														onMouseEnter={() => prefetchRoute(subItem.path)}
														onFocus={() => prefetchRoute(subItem.path)}
													>
														{subItem.icon}
														<span>{subItem.title}</span>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</>
							) : (
								<SidebarMenuButton
									isActive={itemActive}
									render={item.path ? <Link href={item.path} /> : undefined}
									onMouseEnter={() => prefetchRoute(item.path)}
									onFocus={() => prefetchRoute(item.path)}
								>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							)}
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
