import type { Metadata } from "next";
import { InsetLoginShowcasePage } from "./login";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function Login(){
  return(
    <InsetLoginShowcasePage/>
  )
}