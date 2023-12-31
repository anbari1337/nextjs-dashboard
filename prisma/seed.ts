import { customers, revenue, users } from "../app/lib/placeholder-data.js";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import prisma from "./prisma-client.ts";
import { Invoice } from "@/app/lib/definitions.ts";

async function seedUsers() {
  try {
    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const uniqueUser = await prisma.user.findUnique({
          where: {
            email: user.email,
          },
        });
        if (uniqueUser) return;

        const result = await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            password: hashedPassword,
          },
        });
      })
    );

    console.log(`Seeded ${insertedUsers.length} users`);
  } catch (error) {
    console.error("Error seeding users:", error);
    throw error;
  }
}

async function seedCustomers() {
  try {
    // Insert data into the "customers" table
    const insertedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const result = await prisma.customer.create({
          data: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            image_url: customer.image_url,
            invoice: {
              create: customer.invoices.map((invoice) => ({
                id: uuid(),
                amount: invoice.amount,
                status: invoice.status as "pending" | "paid",
                date: invoice.date,
              })),
            },
          },
        });
      })
    );

    console.log(`Seeded ${insertedCustomers.length} customers`);
  } catch (error) {
    console.error("Error seeding customers:", error);
    throw error;
  }
}

async function seedRevenue() {
  try {
    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      revenue.map(async (rev) => {
        const result = await prisma.revenue.create({
          data: {
            month: rev.month,
            revenue: rev.revenue,
          },
        });
      })
    );

    console.log(`Seeded ${insertedRevenue.length} revenue`);
  } catch (error) {
    console.error("Error seeding revenue:", error);
    throw error;
  }
}

async function main() {
  await prisma.$connect();

  await seedUsers();
  await seedCustomers();
  await seedRevenue();

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(
    "An error occurred while attempting to seed the database:",
    err
  );
});
