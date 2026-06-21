import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const parsed = new URL(url);
const adapterOptions: any = {
  host: parsed.hostname,
  user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
  password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  allowPublicKeyRetrieval: true,
};
if (parsed.pathname && parsed.pathname !== '/') {
  adapterOptions.database = parsed.pathname.replace(/^\//, '');
}
if (parsed.port) {
  adapterOptions.port = Number(parsed.port);
}

const adapter = new PrismaMariaDb(adapterOptions);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Seeding default roles...');
  const roles = [
    {
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Highest access level, can manage everything.',
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access for system configuration and user management.',
    },
    {
      name: 'Editor',
      slug: 'editor',
      description: 'Can publish and manage posts including those of other users.',
    },
    {
      name: 'Author',
      slug: 'author',
      description: 'Can publish and manage their own posts.',
    },
    {
      name: 'SEO Manager',
      slug: 'seo-manager',
      description: 'Can manage SEO meta tags, sitemaps, and redirects.',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { slug: 'super-admin' },
  });

  if (!superAdminRole) {
    throw new Error('Super Admin role could not be seeded.');
  }

  console.log('Seeding default Super Admin user...');
  const adminEmail = 'admin@dbsbackend.local';
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    const passwordHash = await argon2.hash('SuperAdmin123!');
    await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash,
        roleId: superAdminRole.id,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    console.log('Super Admin user created: admin@dbsbackend.local / SuperAdmin123!');
  } else {
    console.log('Super Admin user already exists.');
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
