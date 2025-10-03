address risein_poap {
module risein_poap {  
    use std::string::{Self, String};  
    use std::vector;  
    use std::signer;  
    use std::option;  
    use aptos_framework::timestamp;  
    use aptos_std::table::{Self, Table};  
    use aptos_token_objects::collection;  
    use aptos_token_objects::token;

    // Error codes
    const EPOAP_NOT_INITIALIZED: u64 = 1;
    const EEVENT_NOT_FOUND: u64 = 2;
    const EEVENT_NOT_ACTIVE: u64 = 3;
    const EEVENT_ENDED: u64 = 4;
    const EBADGE_ALREADY_CLAIMED: u64 = 5;
    const EINVALID_TIME_RANGE: u64 = 6;
    const EMAX_ATTENDEES_REACHED: u64 = 7;

    // Event data
    struct Event has store, copy, drop {
        id: u64,
        name: String,
        description: String,
        location: String,
        start_time: u64,
        end_time: u64,
        max_attendees: u64,
        current_attendees: u64,
        organizer: address,
        created_at: u64,
    }

    // Badge data
    struct Badge has store, copy, drop {
        event_id: u64,
        event_name: String,
        badge_number: u64,
        minted_at: u64,
        attendee: address,
        token_id: String,
    }

    // POAP storage
    struct POAPData has key {
        events: vector<Event>,
        event_count: u64,
        badges: Table<address, vector<Badge>>,
        event_badges: Table<u64, u64>,
        user_event_badges: Table<address, Table<u64, bool>>,
        collection_name: String,
    }

    // Initialize POAP
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<POAPData>(addr)) {
            let collection_name = string::utf8(b"RiseIn POAP Collection");
            collection::create_unlimited_collection(
                account,
                string::utf8(b"Proof of Attendance badges"),
                collection_name,
                option::none(),
                string::utf8(b"https://risein.com")
            );
            move_to(account, POAPData {
                events: vector::empty<Event>(),
                event_count: 0,
                badges: table::new<address, vector<Badge>>(),
                event_badges: table::new<u64, u64>(),
                user_event_badges: table::new<address, Table<u64, bool>>(),
                collection_name,
            });
        };
    }

    // Create a new event
    public entry fun create_event(
        organizer: &signer,
        name: String,
        description: String,
        location: String,
        start_time: u64,
        end_time: u64,
        max_attendees: u64,
    ) acquires POAPData {
        let now = timestamp::now_seconds();
        assert!(start_time < end_time, EINVALID_TIME_RANGE);
        // Allow events to start now or in the future (>= instead of >)
        assert!(start_time >= now, EINVALID_TIME_RANGE);

        let addr = signer::address_of(organizer);
        let poap = borrow_global_mut<POAPData>(addr);

        let id = poap.event_count;
        let evt = Event {
            id,
            name,
            description,
            location,
            start_time,
            end_time,
            max_attendees,
            current_attendees: 0,
            organizer: addr,
            created_at: now,
        };
        vector::push_back(&mut poap.events, copy evt);
        poap.event_count = id + 1;
        table::add(&mut poap.event_badges, id, 0);
    }

    // Claim a badge
    public entry fun claim_badge(
        attendee: &signer,
        organizer_addr: address,
        event_id: u64,
    ) acquires POAPData {
        let addr = signer::address_of(attendee);
        let now = timestamp::now_seconds();
        assert!(exists<POAPData>(organizer_addr), EPOAP_NOT_INITIALIZED);

        let poap = borrow_global_mut<POAPData>(organizer_addr);
        assert!(event_id < vector::length(&poap.events), EEVENT_NOT_FOUND);

        let evt_ref = vector::borrow_mut(&mut poap.events, event_id);
        assert!(now >= evt_ref.start_time, EEVENT_NOT_ACTIVE);
        assert!(now <= evt_ref.end_time, EEVENT_ENDED);
        assert!(evt_ref.current_attendees < evt_ref.max_attendees, EMAX_ATTENDEES_REACHED);

        if (!table::contains(&poap.user_event_badges, addr)) {
            table::add(&mut poap.user_event_badges, addr, table::new<u64, bool>());
        };
        let user_map = table::borrow_mut(&mut poap.user_event_badges, addr);
        assert!(!table::contains(user_map, event_id), EBADGE_ALREADY_CLAIMED);
        table::add(user_map, event_id, true);

        evt_ref.current_attendees = evt_ref.current_attendees + 1;
        let badge_count_ref = table::borrow_mut(&mut poap.event_badges, event_id);
        *badge_count_ref = *badge_count_ref + 1;
        let badge_no = *badge_count_ref;

        // Build token name
        let token_name = string::utf8(b"POAP #");

        // Mint the token
        token::create_named_token(
            attendee,
            poap.collection_name,
            string::utf8(b"Proof of Attendance badge"),
            token_name,
            option::none(),
            string::utf8(b"https://api.dicebear.com/7.x/shapes/svg?seed="),
        );

        // Build token ID
        let token_id_str = string::utf8(b"POAP Badge");

        let badge = Badge {
            event_id,
            event_name: evt_ref.name,
            badge_number: badge_no,
            minted_at: now,
            attendee: addr,
            token_id: token_id_str,
        };
        if (!table::contains(&poap.badges, addr)) {
            table::add(&mut poap.badges, addr, vector::empty<Badge>());
        };
        let vb = table::borrow_mut(&mut poap.badges, addr);
        vector::push_back(vb, badge);
    }

    // Sample event for testing
    public entry fun create_sample_event(organizer: &signer) acquires POAPData {
        let now = timestamp::now_seconds();
        create_event(
            organizer,
            string::utf8(b"Web3 Meetup"),
            string::utf8(b"Monthly community event"),
            string::utf8(b"Online"),
            now + 60,
            now + 3600,
            100,
        );
    }

    // View: all events
    #[view] public fun get_all_events(addr: address): vector<Event> acquires POAPData {
        if (!exists<POAPData>(addr)) { return vector::empty<Event>() };
        borrow_global<POAPData>(addr).events
    }

    // View: user badges
    #[view] public fun get_user_badges(user: address, org: address): vector<Badge> acquires POAPData {
        if (!exists<POAPData>(org)) { return vector::empty<Badge>() };
        let poap = borrow_global<POAPData>(org);
        if (!table::contains(&poap.badges, user)) { return vector::empty<Badge>() };
        *table::borrow(&poap.badges, user)
    }

    // View: get event count
    #[view] public fun get_event_count(addr: address): u64 acquires POAPData {
        if (!exists<POAPData>(addr)) { return 0 };
        borrow_global<POAPData>(addr).event_count
    }
}
}