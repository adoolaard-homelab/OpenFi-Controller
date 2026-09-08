import { NextResponse } from "next/server";
import { deleteRouter } from "@/lib/router-store";
export async function DELETE(_: Request, { params }: { params: { id: string } }) { await deleteRouter(params.id); return new NextResponse(null, { status: 204 }); }
