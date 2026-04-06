// ===== Dados Demo Pre-carregados =====

const DEMO_PROFILES = {
    natgeo: {
        profile: {
            username: "natgeo",
            full_name: "National Geographic",
            biography: "Experience the world through the eyes of National Geographic photographers.",
            followers: 284000000,
            following: 152,
            media_count: 32500,
            is_verified: true,
            is_business: true,
            business_category: "Media/News",
        },
        posts: generatePosts({
            count: 50,
            likesRange: [200000, 2500000],
            commentsRange: [500, 15000],
            types: ["IMAGE","IMAGE","IMAGE","IMAGE","IMAGE","CAROUSEL","CAROUSEL","CAROUSEL","VIDEO","VIDEO"],
            hashtags: ["#natgeo","#nature","#wildlife","#photography","#earth","#animals","#ocean","#adventure","#conservation","#planet","#explore","#biodiversity"],
            captions: [
                "A breathtaking view of the Serengeti at dawn. The golden light paints the savanna in warm hues as wildlife begins to stir.",
                "Nature never ceases to amaze. Deep in the Amazon, life thrives in every corner of this magnificent ecosystem.",
                "Captured at the perfect moment — a rare snow leopard in the Himalayas. These elusive creatures remind us of nature's hidden wonders.",
                "The beauty of our planet is beyond words. Norwegian fjords at sunset create a mirror of colors.",
                "Wildlife at its finest — a rare encounter in the Galapagos Islands. Evolution in action.",
                "Sunrise over the Great Barrier Reef — magic in every ray of light filtering through crystal waters.",
                "Deep in the heart of Madagascar, endemic species found nowhere else on Earth continue to fascinate researchers.",
                "The ocean speaks volumes. Humpback whales breach in the waters of Patagonia.",
                "Yellowstone's geothermal wonders remind us of the raw power beneath our feet.",
                "Mount Fuji draped in morning mist — a timeless symbol of natural beauty and cultural significance.",
                "The Arctic ice cap, both fragile and magnificent, tells the story of our changing planet.",
                "Under the canopy of the Amazon, new species are still being discovered every year.",
            ]
        })
    },

    instagram: {
        profile: {
            username: "instagram",
            full_name: "Instagram",
            biography: "Bringing you closer to the people and things you love. ❤️",
            followers: 672000000,
            following: 75,
            media_count: 7800,
            is_verified: true,
            is_business: true,
            business_category: "Internet Company",
        },
        posts: generatePosts({
            count: 50,
            likesRange: [500000, 8000000],
            commentsRange: [2000, 50000],
            types: ["IMAGE","IMAGE","IMAGE","CAROUSEL","CAROUSEL","CAROUSEL","VIDEO","VIDEO","VIDEO","VIDEO"],
            hashtags: ["#instagram","#instagood","#reels","#creators","#community","#creativity","#inspire","#share","#connect","#stories","#trending","#viral"],
            captions: [
                "Creativity takes many forms. What inspires you today? Share your story with the world.",
                "Your story matters. Every voice, every perspective adds color to our community.",
                "Made with love by creators who push boundaries and challenge the ordinary.",
                "Bringing people together, one post at a time. That's what we're all about.",
                "New features dropping soon! Stay tuned for exciting updates that empower creators.",
                "Celebrating creators who redefine what's possible. Your talent inspires millions.",
                "This week's spotlight: incredible work from creators around the globe.",
                "Express yourself. Create. Inspire. The world is watching and cheering you on.",
                "Behind every great post is a story waiting to be told. What's yours?",
                "Community is everything. Thank you for making this platform what it is.",
                "Reels are changing the game. Short-form content has never been more creative.",
                "From idea to impact — creators are building the future of expression.",
            ]
        })
    },

    cristiano: {
        profile: {
            username: "cristiano",
            full_name: "Cristiano Ronaldo",
            biography: "Football player ⚽ | Entrepreneur 💼 | Family man ❤️",
            followers: 636000000,
            following: 582,
            media_count: 3800,
            is_verified: true,
            is_business: true,
            business_category: "Athlete",
        },
        posts: generatePosts({
            count: 50,
            likesRange: [3000000, 25000000],
            commentsRange: [15000, 200000],
            types: ["IMAGE","IMAGE","IMAGE","IMAGE","IMAGE","CAROUSEL","CAROUSEL","VIDEO","VIDEO","VIDEO"],
            hashtags: ["#cr7","#cristiano","#football","#soccer","#champion","#training","#family","#nike","#goat","#alnassr","#portugal","#siuuu"],
            captions: [
                "Hard work always pays off. Another day pushing my limits on the training ground. 💪",
                "Another day, another victory. Grateful for every opportunity to compete at the highest level.",
                "Training never stops. Focus and dedication are the keys to success.",
                "Grateful for every moment on the pitch. Football is my life and my passion. ⚽",
                "Family first, always. The most important team in my life. ❤️",
                "Champions mentality. Never give up, never surrender. The best is yet to come.",
                "New season, same hunger. Let's go! Ready to give everything for the team.",
                "Teamwork makes the dream work. Proud of this squad and what we can achieve together.",
                "Recovery day. Taking care of the body is just as important as training hard.",
                "Game day! Nothing beats the feeling of walking onto the pitch in front of the fans.",
                "100% commitment, every single day. That's the only way I know.",
                "Blessed to do what I love. The journey continues. SIUUUU! 🐐",
            ]
        })
    }
};

// ===== Gerador de Posts =====
function generatePosts(config) {
    const posts = [];
    const now = Date.now();
    const seed = 42;
    let rng = seed;

    function random() {
        rng = (rng * 16807 + 0) % 2147483647;
        return (rng - 1) / 2147483646;
    }

    function randInt(min, max) {
        return Math.floor(random() * (max - min + 1)) + min;
    }

    // Weighted hour distribution (peak at business hours)
    const hourWeights = [1,1,1,1,1,2,3,4,5,6,6,7,8,7,6,5,6,7,8,7,5,3,2,1];
    const totalWeight = hourWeights.reduce((a, b) => a + b, 0);

    function weightedHour() {
        let r = random() * totalWeight;
        for (let h = 0; h < 24; h++) {
            r -= hourWeights[h];
            if (r <= 0) return h;
        }
        return 12;
    }

    for (let i = 0; i < config.count; i++) {
        const daysAgo = random() * 180;
        const hour = weightedHour();
        const timestamp = new Date(now - daysAgo * 86400000);
        timestamp.setHours(hour, randInt(0, 59), 0, 0);

        const mediaType = config.types[randInt(0, config.types.length - 1)];
        const isVideo = mediaType === "VIDEO";

        let likes = randInt(config.likesRange[0], config.likesRange[1]);
        if (isVideo) likes = Math.floor(likes * (1.1 + random() * 0.4));
        const comments = randInt(config.commentsRange[0], config.commentsRange[1]);

        // Build caption
        const captionBase = config.captions[i % config.captions.length];
        const numTags = randInt(3, 6);
        const shuffled = [...config.hashtags].sort(() => random() - 0.5);
        const tags = shuffled.slice(0, numTags).join(" ");
        const caption = captionBase + " " + tags;

        posts.push({
            caption,
            likes,
            comments,
            timestamp: timestamp.toISOString(),
            media_type: mediaType,
            is_video: isVideo,
            video_view_count: isVideo ? randInt(likes * 2, likes * 5) : null,
        });
    }

    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return posts;
}
