"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { IconArrowUpRight, IconPlus } from "@tabler/icons-react";

export function Hero() {
  return (
    <div className="pt-10 px-4 lg:px-0 flex mx-auto max-w-6xl flex-col items-center justify-center text-center">
      <div className="grid w-full border-0 border-b md:border relative grid-cols-10">
        <div
          className="absolute inset-0 -z-20"
          style={{
            background:
              "radial-gradient(80% 100% at 0% 100%, #d797df63 50%, #135dd587 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, black 0%, transparent 60%)",
            maskImage:
              "linear-gradient(to top, black 0%, transparent 60%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        />
         
        <IconPlus size={30} strokeWidth={0.8} className="absolute -top-4 -left-4" />
        <IconPlus
          size={30}
          strokeWidth={0.8}
          className="absolute -bottom-4 -right-4"
        />
        <div className="md:grid hidden w-full col-span-1">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="border-b last:border-0 flex-1 aspect-square"
            />
          ))}
        </div>
        <div className="md:col-span-8 col-span-10">
          <div className="md:flex hidden">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="border-l last:border-r flex-1 aspect-square"
              />
            ))}
          </div>
          <div className="relative w-full border -mt-0.5 flex items-center flex-col justify-center  md:h-89 lg:h-116 p-6 md:p-20">
            <h1 className="flex flex-col text-center text-3xl leading-none font-semibold tracking-tight lg:text-5xl">
            Nodeline Satu Platform untuk Semua Kebutuhan.
            </h1>
            <p className="md:text-md text-muted-foreground py-6 lg:text-lg">
              Apapun yang kamu cari, mungkin ada di sini.{" "}
              <br /> Coba dulu, baru tahu.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={"/marketplace"}>
                <Button
                  className="cursor-pointer rounded-full w-46 h-12"
                  variant="default"
                >
                  Jelajahi
                  <IconArrowUpRight/>
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative w-full h-full">
            <div className="absolute z-10 top-15 md:top-22 lg:top-29 left-1/2 -translate-x-1/2 -translate-y-1/2">

            </div>

            <div className="flex">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-l last:border-r border-b flex-1 aspect-square"
                />
              ))}
            </div>
            <div className="flex">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-l border-b last:border-r flex-1 aspect-square"
                />
              ))}
            </div>
            <div className="flex">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-l last:border-r flex-1 aspect-square"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="md:grid hidden col-span-1">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="border-b last:border-b-0 flex-1 aspect-square"
            />
          ))}
        </div>
      </div>
    </div>
  );
}