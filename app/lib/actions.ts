"use server";
import prisma from "@/prisma/prisma-client";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoide(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  const invoice = await prisma.invoice.create({
    data: {
      id: uuid(),
      customerId,
      status,
      amount: amountInCents,
      date,
    },
  });

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
