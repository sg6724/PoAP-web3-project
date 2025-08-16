module POAP::POAP {
    use std::signer;
    use std::string;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::timestamp;

    struct Badge has copy, drop, store {
        id: u64,
        event_name: string::String,
        owner: address,
    }

    struct Event has key {
        name: string::String,
        organizer: address,
        start_time: u64,
        end_time: u64,
        next_badge_id: u64,
    }

    struct Minted has key {
        badges: vector<Badge>,
    }

    /// Organizer creates an event
    public entry fun create_event(
        organizer: &signer,
        name: string::String,
        start_time: u64,
        end_time: u64
    ) {
        move_to(organizer, Event {
            name,
            organizer: signer::address_of(organizer),
            start_time,
            end_time,
            next_badge_id: 0,
        });
    }

    /// Mint a soulbound badge (POAP)
    public entry fun mint_badge(
        event_organizer: &signer,
        attendee: address
    ) {
        var event = borrow_global_mut<Event>(signer::address_of(event_organizer));
        let now = timestamp::now_seconds();
        assert!(now >= event.start_time, 1);
        assert!(now <= event.end_time, 2);

        let badge = Badge {
            id: event.next_badge_id,
            event_name: event.name.clone(),
            owner: attendee,
        };
        event.next_badge_id = event.next_badge_id + 1;

        if (!exists<Minted>(attendee)) {
            move_to(&account::create_signer(attendee), Minted { badges: vector::empty<Badge>() });
        };
        
        var minted = borrow_global_mut<Minted>(attendee);

        // Only allow one badge per event per user
        let len = vector::length(&minted.badges);
        var i = 0;
        while (i < len) {
            let b = vector::borrow(&minted.badges, i);
            if (b.event_name == event.name) {
                assert!(false, 3); // already claimed
            };
            i = i + 1;
        };

        vector::push_back(&mut minted.badges, badge);
    }

    /// View function: Get user’s POAP badges
    public fun get_badges(user: address): &vector<Badge> {
        &borrow_global<Minted>(user).badges
    }
}
