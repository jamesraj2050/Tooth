import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create default availability (Monday to Saturday, 9 AM to 7 PM)
  const daysOfWeek = [
    { day: 1, name: "Monday" },
    { day: 2, name: "Tuesday" },
    { day: 3, name: "Wednesday" },
    { day: 4, name: "Thursday" },
    { day: 5, name: "Friday" },
    { day: 6, name: "Saturday" },
  ]

  for (const day of daysOfWeek) {
    const existing = await prisma.availability.findFirst({
      where: { dayOfWeek: day.day },
    })

    if (!existing) {
      await prisma.availability.create({
        data: {
          dayOfWeek: day.day,
          startTime: "09:00",
          endTime: "19:00",
          isActive: true,
        },
      })
    } else {
      await prisma.availability.update({
        where: { id: existing.id },
        data: {
          startTime: "09:00",
          endTime: "19:00",
          isActive: true,
        },
      })
    }
  }

  console.log("✅ Seeded availability data")

  // Create Admin users
  const adminAccounts = [
    { email: "Admin@AusDenta.au", name: "Admin", password: "Admin@135" },
    { email: "Admin2@gmail.com", name: "Admin2", password: "Admin2@135" },
  ]

  for (const admin of adminAccounts) {
    const hashedPassword = await bcrypt.hash(admin.password, 10)

    const existingAdmin = await prisma.user.findUnique({
      where: { email: admin.email },
    })

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: admin.email,
          name: admin.name,
          password: hashedPassword,
          role: "ADMIN",
        },
      })
      console.log(`✅ Created admin user ${admin.email}`)
    } else {
      await prisma.user.update({
        where: { email: admin.email },
        data: {
          password: hashedPassword,
          role: "ADMIN",
          name: admin.name,
        },
      })
      console.log(`✅ Updated admin user ${admin.email}`)
    }
  }

  // Create Doctor user (you can customize this)
  const doctorEmail = "Doctor@AusDenta.au"
  const doctorPassword = "Doctor@123"
  const hashedDoctorPassword = await bcrypt.hash(doctorPassword, 10)

  const existingDoctor = await prisma.user.findUnique({
    where: { email: doctorEmail },
  })

  if (!existingDoctor) {
    await prisma.user.create({
      data: {
        email: doctorEmail,
        name: "Dr. Chandy Koruthu",
        password: hashedDoctorPassword,
        role: "DOCTOR",
      },
    })
    console.log("✅ Created doctor user")
  } else {
    await prisma.user.update({
      where: { email: doctorEmail },
      data: {
        password: hashedDoctorPassword,
        role: "DOCTOR",
      },
    })
    console.log("✅ Updated doctor user")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

