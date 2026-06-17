import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du peuplement de la base de données (seeding)...');

  // 1. Initialisation / Mise à jour des rôles avec permissions associées
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {
      permissions: ['*'], // Accès total
    },
    create: {
      name: 'Super Admin',
      permissions: ['*'],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${superAdminRole.name}`);

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
        'read:auditlogs',
        'export:auditlogs',
      ],
    },
    create: {
      name: 'Admin',
      permissions: [
        'read:admins',
        'write:admins',
        'read:products',
        'write:products',
        'read:categories',
        'write:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'write:payments',
        'read:analytics',
        'read:auditlogs',
        'export:auditlogs',
      ],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${adminRole.name}`);

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
    create: {
      name: 'Manager',
      permissions: [
        'read:products',
        'read:categories',
        'read:orders',
        'write:orders',
        'read:reservations',
        'write:reservations',
        'read:payments',
        'read:analytics',
      ],
    },
  });
  console.log(`- Rôle créé ou mis à jour : ${managerRole.name}`);

  // 2. Création de l'administrateur par défaut
  const defaultAdminEmail = 'admin@crustys.com';
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const defaultAdmin = await prisma.admin.upsert({
    where: { email: defaultAdminEmail },
    update: {
      fullName: 'Super Administrateur',
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
    create: {
      fullName: 'Super Administrateur',
      email: defaultAdminEmail,
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
  });

  console.log(`- Administrateur créé ou mis à jour : ${defaultAdmin.email}`);

  // 3. Seed Categories and Products
  console.log('🌱 Seeding Categories and Products...');
  const categories = [
    { name: "Burgers de bœuf / Beef Burgers", slug: "burgers-de-boeuf-beef-burgers", description: "Delicious beef burgers double-smashed." },
    { name: "Burgers au poulet / Chicken Burgers", slug: "burgers-au-poulet-chicken-burgers", description: "Crispy buttermilk chicken burgers." },
    { name: "Sandwichs baguette / Baguette Sandwiches", slug: "sandwichs-baguette-baguette-sandwiches", description: "Fresh baguette sandwiches." },
    { name: "Plateaux / Platters", slug: "plateaux-platters", description: "Complete platters and sharing boxes." },
    { name: "Entrées / Appetizers", slug: "entrees-appetizers", description: "Golden crispy french fries, onion rings, etc." },
    { name: "Extras", slug: "extras", description: "Extra side portions and house-crafted dipping sauces." },
    { name: "Boissons froides / Cold Drinks", slug: "boissons-froides-cold-drinks", description: "Ice-cold refreshing sodas and bottled water." }
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        isActive: true,
      }
    });
    categoryMap[cat.name] = category.id;
    console.log(`- Catégorie créée ou mise à jour : ${category.name}`);
  }

  // products
  const products = [
    {
      name: "Double smash burger",
      description: "2 galettes de boeuf, fromage cheddar, laitue, cornichon, oignon frais et sauce maison. / 2 beef patties, cheddar cheese, lettuce, pickle, fresh onion and house sauce.",
      price: 16.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/double_smash_burger.png",
      slug: "beef-double-smash",
      isFeatured: true
    },
    {
      name: "Smash burger",
      description: "Galette de boeuf, Salades, oignon, cornichons et fromage. / Beef patty, lettuce, onions, pickles and cheese",
      price: 12.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/smash_burger.png",
      slug: "beef-smash-burger"
    },
    {
      name: "Crustys burger",
      description: "Galettes de boeuf, oignon, champignons épicé, sauce épicé, salades, poivrons couleurs, jalapeño et fromage mozzarella / Beef patties, onion, spicy mushrooms, spicy sauce, lettuce, colored peppers, jalapeño and mozzarella.",
      price: 14.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/crustys_burger.png",
      slug: "beef-crustys-burger"
    },
    {
      name: "Beef Patty burger",
      description: "Galette de boeuf, salades, cornichon, oignon, fromage frit et sauce maison / Beef patty, salads, pickle, onion, fried cheese and homemade sauce.",
      price: 14.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/beef_patty_burger.png",
      slug: "beef-patty-burger"
    },
    {
      name: "Burger cheese mushroom",
      description: "Galette de viande, laitue, cornichons, fromage cheddar jaune, champignon grillé, oignon, sauce maison et sauce mayonnaise. / Meat patty, lettuce, pickles, yellow cheddar cheese, grilled mushroom, onion, house sauce and mayo.",
      price: 22.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/burger_cheese_mushroom.png",
      slug: "beef-champignon"
    },
    {
      name: "Onion rings burger",
      description: "2 galettes de boeuf, fromage cheddar, cornichon, oignon caramélisé, rondelles d'oignons frites et sauce maison. / 2 beef patties, cheddar cheese, pickle, caramelized onion, fried onion rings and house sauce.",
      price: 14.99,
      categoryName: "Burgers de bœuf / Beef Burgers",
      image: "/images/onion_rings_burger.png",
      slug: "beef-rondelle-oignon"
    },
    {
      name: "Fried chicken burger",
      description: "Poulet croustillant, laitue, cornichon, fromage cheddar jaune et sauce maison. / Crispy chicken, lettuce, pickle, yellow cheddar cheese and house sauce.",
      price: 21.99,
      categoryName: "Burgers au poulet / Chicken Burgers",
      image: "/images/fried_chicken_burger.png",
      slug: "chicken-fried-chicken",
      isFeatured: true
    },
    {
      name: "Chicken mashroom burger",
      description: "Crispy fried chicken topped with sautéed mushrooms, melted cheese, fresh lettuce, and a savory sauce in a soft bun.",
      price: 22.99,
      categoryName: "Burgers au poulet / Chicken Burgers",
      image: "/images/chicken_mushroom_burger.png",
      slug: "chicken-mushroom"
    },
    {
      name: "Chicken Patty burger",
      description: "Crispy fried chicken patty, melted cheese, fresh lettuce, and creamy sauce on a soft bun.",
      price: 11.99,
      categoryName: "Burgers au poulet / Chicken Burgers",
      image: "/images/chicken_patty_burger.png",
      slug: "chicken-patty-burger"
    },
    {
      name: "Sous marin poulet 7 \"",
      description: "Baguette de poitrine de poulet de 7 pouces avec oignons caramélisés, sauce buffalo, cheddar et fromage mozzarella. / 7 inch chicken breast baguette with caramelized onions, buffalo sauce, cheddar and mozzarella.",
      price: 9.99,
      categoryName: "Sandwichs baguette / Baguette Sandwiches",
      image: "https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80",
      slug: "baguette-poulet"
    },
    {
      name: "Sous marin boeuf 7 \"",
      description: "Baguette philly steak de 7 pouces. Boeuf avec fromage cheddar aux champignons et oignons caramélisés. / 7 inch philly steak baguette. Beef with cheddar cheese, mushrooms and caramelized onions.",
      price: 10.99,
      categoryName: "Sandwichs baguette / Baguette Sandwiches",
      image: "/images/sous_marin_boeuf.png",
      slug: "baguette-boeuf"
    },
    {
      name: "Poulet mac attack / Mac Attack Chicken",
      description: "Poulet croustillant, frites, macaroni au fromage, oignon et sauce par dessus./Crispy chicken, fries, macaroni and cheese, onion and sauce on top.",
      price: 14.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=600&q=80",
      slug: "platters-mac-attack",
      isFeatured: true
    },
    {
      name: "Bœuf mac attack / Mac Attack Beef",
      description: "Steak beef ,frites, macaroni au fromage ,onion et sauce par dessus./Beef steak, fries, macaroni and cheese, onion and sauce on top.",
      price: 16.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=600&q=80",
      slug: "platters-mac-attack-beef"
    },
    {
      name: "Fried chicken / 3 pieces",
      description: "3 morceaux poulet croustillant servi avec frites et une sauce au choix./3 pieces of crispy chicken served with fries and sauce of your choice.",
      price: 15.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80",
      slug: "tenders-3pcs"
    },
    {
      name: "Fried chicken / 5 pieces",
      description: "5 morceaux poulet croustillant servi avec frites et une sauce au choix./5 pieces of crispy chicken served with fries and sauce of your choice.",
      price: 20.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80",
      slug: "tenders-5pcs"
    },
    {
      name: "Loaded fries chicken",
      description: "Poulet croustillant , onion frais, jalapeño, frites, fromage cheddar jaune et sauce maison ./crispy chicken, fresh onion, jalapeño, fries, yellow cheddar cheese and house sauce.",
      price: 14.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80",
      slug: "loaded-fries-chicken"
    },
    {
      name: "Beef loaded fries",
      description: "Steak beef ,onion frais, jalapeño, frites, fromage cheddar jaune et sauce maison ./Beef steak, fresh onion, jalapeño, fries, yellow cheddar cheese and house sauce.",
      price: 15.99,
      categoryName: "Plateaux / Platters",
      image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
      slug: "loaded-fries-beef",
      isFeatured: true
    },
    {
      name: "Petites frites / Small Fries",
      description: "Frites dorées croustillantes. / Golden crispy French fries.",
      price: 4.99,
      categoryName: "Entrées / Appetizers",
      image: "/images/small_fries.png",
      slug: "appetizers-fries"
    },
    {
      name: "Rondelles d'oignon / Onion Rings",
      description: "Crispy onion rings, available in small or large sizes.",
      price: 8.99,
      categoryName: "Entrées / Appetizers",
      image: "https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?auto=format&fit=crop&w=600&q=80",
      slug: "appetizers-onion-rings"
    },
    {
      name: "Grandes frites / Large Fries",
      description: "Frites dorées croustillantes. / Golden crispy French fries.",
      price: 9.99,
      categoryName: "Entrées / Appetizers",
      image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80",
      slug: "appetizers-large-fries"
    },
    {
      name: "Macaroni au fromage / Mac & Cheese",
      description: "Macaroni au fromage servi avec une sauce au choix par dessus./Mac and cheese served with a sauce of your choice on top.",
      price: 7.99,
      categoryName: "Entrées / Appetizers",
      image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80",
      slug: "platters-mac-cheese"
    },
    {
      name: "Sauce",
      description: "Sauce supplémentaire pour accompagner vos plats. / Extra sauce to accompany your dishes.",
      price: 0.99,
      categoryName: "Extras",
      image: "/images/sauce_extras.png",
      slug: "extras-sauce"
    },
    {
      name: "Poulet / Chicken",
      description: "Portion supplémentaire de poulet croustillant savoureux. / Extra side portion of flavorful crispy chicken.",
      price: 5.99,
      categoryName: "Extras",
      image: "/images/chicken_extras.png",
      slug: "extras-poulet"
    },
    {
      name: "Bœuf / Beef",
      description: "Portion supplémentaire de viande de bœuf assaisonnée. / Extra side portion of seasoned beef steak.",
      price: 5.99,
      categoryName: "Extras",
      image: "/images/beef_extras.png",
      slug: "extras-boeuf"
    },
    {
      name: "Sprite",
      description: "Lemon-lime soda with a crisp, refreshing taste.",
      price: 2.99,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/sprite_drink.png",
      slug: "drinks-sprite"
    },
    {
      name: "Coke zero / zero Coke",
      description: "A carbonated cola offering the classic Coke taste with zero sugar.",
      price: 2.99,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/coke_zero_drink.png",
      slug: "drinks-coca-zero"
    },
    {
      name: "Thé glacé / Iced Tea",
      description: "Iced tea, a refreshing beverage brewed from tea leaves, typically served over ice. It may be enjoyed plain or with a hint of lemon.",
      price: 2.99,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/iced_tea_drink.png",
      slug: "drinks-ice-tea"
    },
    {
      name: "Canada Dry",
      description: "Effervescent ginger ale, perfectly crisp with a refreshing finish.",
      price: 2.99,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/canada_dry_drink.png",
      slug: "drinks-canada-dry"
    },
    {
      name: "Crush",
      description: "Effervescent orange soda with a bright citrus flavor.",
      price: 2.99,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/crush_drink.png",
      slug: "drinks-crush"
    },
    {
      name: "Eau 500 ml / Water 500 ml",
      description: "A 500 ml bottle of water, offering hydration with every sip.",
      price: 2.00,
      categoryName: "Boissons froides / Cold Drinks",
      image: "/images/water_bottle_drink.png",
      slug: "drinks-water"
    }
  ];

  for (const prod of products) {
    const categoryId = categoryMap[prod.categoryName];
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        image: prod.image,
        categoryId: categoryId,
        isFeatured: prod.isFeatured || false,
        isAvailable: true,
        stockQuantity: 100,
      }
    });
    console.log(`- Produit créé ou mis à jour : ${prod.name}`);
  }

  console.log('✅ Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding de la base de données :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  });
