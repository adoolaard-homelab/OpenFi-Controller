import { NextResponse } from "next/server";
import { deleteRouter } from "@/lib/router-store";
export async function DELETE(_: Request, { params }: { params: { id: string } }) { try { await deleteRouter(params.id); return new NextResponse(null, { status: 204 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? `Could not remove router: ${error.message}` : "Could not remove router." }, { status: 500 }); } }
