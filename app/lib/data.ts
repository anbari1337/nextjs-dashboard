import { sql } from "@vercel/postgres";
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import prisma from "@/prisma/prisma-client";
import { unstable_noStore as noStore } from "next/cache";

export async function fetchRevenue() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();
  try {
    // Artificially delay a reponse for demo purposes.
    // Don't do this in real life :)

    // console.log("Fetching revenue data...");
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await prisma.revenue.findMany();

    console.log("Data fetch complete after 3 seconds.");

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const topInvoices = await prisma.invoice.findMany({
      select: {
        amount: true,
        id: true,
        customer: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    const latestInvoices = topInvoices.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  noStore();

  try {
    const numberOfInvoices = prisma.invoice.count();
    const numberOfCustomers = prisma.customer.count();
    const totalPaidInvoices = prisma.invoice.count({
      where: {
        status: "paid",
      },
    });
    const totalPendingInvoices = prisma.invoice.count({
      where: {
        status: "pending",
      },
    });

    const data = await Promise.all([
      numberOfInvoices,
      numberOfCustomers,
      totalPaidInvoices,
      totalPendingInvoices,
    ]);

    return {
      numberOfCustomers: data[0],
      numberOfInvoices: data[1],
      totalPaidInvoices: data[2],
      totalPendingInvoices: data[3],
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            amount: {
              equals: parseInt(query) || 0, // Convert to integer for exact match
            },
          },
          {
            date: {
              contains: query,
            },
          },
          {
            status: {
              contains: query,
            },
          },
        ],
      },

      orderBy: {
        date: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    return invoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const invoicesCount = await prisma.invoice.count({
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
              },
            },
          },
          {
            customer: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            amount: {
              equals: parseInt(query) || 0, // Convert to integer for exact match
            },
          },
          {
            date: {
              contains: query,
            },
          },
          {
            status: {
              contains: query,
            },
          },
        ],
      },
    });

    const totalPages = Math.ceil(Number(invoicesCount) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTable>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * from USERS where email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}
