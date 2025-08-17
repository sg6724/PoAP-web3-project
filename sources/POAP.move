module poap_addr::risein_poap {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::option;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    /// Error codes
    const E_NOT_ORGANIZER: u64 = 1;
    const E_EVENT_NOT_FOUND: u64 = 2;
    const E_EVENT_NOT_ACTIVE: u64 = 3;
    const E_ALREADY_CLAIMED: u64 = 4;
    const E_INSUFFICIENT_BALANCE: u64 = 5;
    const E_POAP_NOT_INITIALIZED: u64 = 6;

    /// Event struct representing a RiseIn Web3 meetup
    struct EventInfo has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        organizer: address,
        start_time: u64,
        end_time: u64,
        location: String,
        max_attendees: u64,
        current_attendees: u64,
        is_active: bool,
    }

    /// Badge representing proof of attendance
    struct Badge has store, drop, copy {
        event_id: u64,
        attendee: address,
        event_name: String,
        minted_at: u64,
        badge_number: u64,
    }

    /// Main POAP resource
    struct RiseInPOAP has key {
        events: vector<EventInfo>,
        badges: vector<Badge>,
        event_counter: u64,
        badge_counter: u64,
        organizer: address,
        collection_name: String,
    }

    #[event]
    struct EventCreated has drop, store {
        event_id: u64,
        name: String,
        organizer: address,
        start_time: u64,
        end_time: u64,
    }

    #[event]
    struct BadgeMinted has drop, store {
        event_id: u64,
        attendee: address,
        badge_number: u64,
        event_name: String,
        minted_at: u64,
    }

    #[event]
    struct EventStatusChanged has drop, store {
        event_id: u64,
        is_active: bool,
    }

    /// Initialize the POAP system
    public entry fun initialize(organizer: &signer) {
        let organizer_addr = signer::address_of(organizer);
        
        let collection_name = string::utf8(b"RiseIn Web3 POAP Collection");
        let description = string::utf8(b"Proof of Attendance Protocol badges for RiseIn Web3 Community events");
        let uri = string::utf8(b"https://risein.com/poap/collection");
        
        collection::create_unlimited_collection(
            organizer,
            description,
            collection_name,
            option::none(),
            uri,
        );

        let poap = RiseInPOAP {
            events: vector::empty<EventInfo>(),
            badges: vector::empty<Badge>(),
            event_counter: 0,
            badge_counter: 0,
            organizer: organizer_addr,
            collection_name,
        };

        move_to(organizer, poap);
    }

    /// Create a new event
    public entry fun create_event(
        organizer: &signer,
        name: String,
        description: String,
        start_time: u64,
        end_time: u64,
        location: String,
        max_attendees: u64,
    ) acquires RiseInPOAP {
        let organizer_addr = signer::address_of(organizer);
        assert!(exists<RiseInPOAP>(organizer_addr), E_POAP_NOT_INITIALIZED);
        
        let poap = borrow_global_mut<RiseInPOAP>(organizer_addr);
        assert!(poap.organizer == organizer_addr, E_NOT_ORGANIZER);

        let event_id = poap.event_counter;
        let event_info = EventInfo {
            id: event_id,
            name,
            description,
            organizer: organizer_addr,
            start_time,
            end_time,
            location,
            max_attendees,
            current_attendees: 0,
            is_active: true,
        };

        vector::push_back(&mut poap.events, event_info);
        poap.event_counter = event_id + 1;

        event::emit(EventCreated {
            event_id,
            name: event_info.name,
            organizer: organizer_addr,
            start_time,
            end_time,
        });
    }

    /// Claim a POAP badge for attendance
    public entry fun claim_badge(
        attendee: &signer,
        organizer_addr: address,
        event_id: u64,
    ) acquires RiseInPOAP {
        let attendee_addr = signer::address_of(attendee);
        assert!(exists<RiseInPOAP>(organizer_addr), E_POAP_NOT_INITIALIZED);
        
        let poap = borrow_global_mut<RiseInPOAP>(organizer_addr);
        assert!(event_id < vector::length(&poap.events), E_EVENT_NOT_FOUND);

        let event_info = vector::borrow_mut(&mut poap.events, event_id);
        let current_time = timestamp::now_seconds();

        assert!(event_info.is_active, E_EVENT_NOT_ACTIVE);
        assert!(current_time >= event_info.start_time && current_time <= event_info.end_time, E_EVENT_NOT_ACTIVE);

        let already_claimed = has_claimed_badge(attendee_addr, event_id, &poap.badges);
        assert!(!already_claimed, E_ALREADY_CLAIMED);

        assert!(event_info.current_attendees < event_info.max_attendees, E_INSUFFICIENT_BALANCE);

        let badge_number = poap.badge_counter;
        let badge = Badge {
            event_id,
            attendee: attendee_addr,
            event_name: event_info.name,
            minted_at: current_time,
            badge_number,
        };

        let token_name = string::utf8(b"RiseIn Web3 POAP #");
        string::append(&mut token_name, num_to_string(badge_number));
        
        let token_description = string::utf8(b"Proof of Attendance for ");
        string::append(&mut token_description, event_info.name);

        let token_uri = string::utf8(b"https://risein.com/poap/badges/");
        string::append(&mut token_uri, num_to_string(badge_number));

        token::create_named_token(
            attendee,
            poap.collection_name,
            token_description,
            token_name,
            option::none(),
            token_uri,
        );

        vector::push_back(&mut poap.badges, badge);
        event_info.current_attendees = event_info.current_attendees + 1;
        poap.badge_counter = badge_number + 1;

        event::emit(BadgeMinted {
            event_id,
            attendee: attendee_addr,
            badge_number,
            event_name: event_info.name,
            minted_at: current_time,
        });
    }

    /// Toggle event active status
    public entry fun toggle_event_status(
        organizer: &signer,
        event_id: u64,
    ) acquires RiseInPOAP {
        let organizer_addr = signer::address_of(organizer);
        assert!(exists<RiseInPOAP>(organizer_addr), E_POAP_NOT_INITIALIZED);
        
        let poap = borrow_global_mut<RiseInPOAP>(organizer_addr);
        assert!(poap.organizer == organizer_addr, E_NOT_ORGANIZER);
        assert!(event_id < vector::length(&poap.events), E_EVENT_NOT_FOUND);

        let event_info = vector::borrow_mut(&mut poap.events, event_id);
        event_info.is_active = !event_info.is_active;

        event::emit(EventStatusChanged {
            event_id,
            is_active: event_info.is_active,
        });
    }

    #[view]
    public fun get_event_info(organizer_addr: address, event_id: u64): EventInfo acquires RiseInPOAP {
        let poap = borrow_global<RiseInPOAP>(organizer_addr);
        assert!(event_id < vector::length(&poap.events), E_EVENT_NOT_FOUND);
        *vector::borrow(&poap.events, event_id)
    }

    #[view]
    public fun get_all_events(organizer_addr: address): vector<EventInfo> acquires RiseInPOAP {
        let poap = borrow_global<RiseInPOAP>(organizer_addr);
        poap.events
    }

    #[view]
    public fun get_user_badges(organizer_addr: address, user_addr: address): vector<Badge> acquires RiseInPOAP {
        let poap = borrow_global<RiseInPOAP>(organizer_addr);
        let user_badges = vector::empty<Badge>();
        let i = 0;
        while (i < vector::length(&poap.badges)) {
            let badge = vector::borrow(&poap.badges, i);
            if (badge.attendee == user_addr) {
                vector::push_back(&mut user_badges, *badge);
            };
            i = i + 1;
        };
        user_badges
    }

    #[view]
    public fun get_event_attendees_count(organizer_addr: address, event_id: u64): u64 acquires RiseInPOAP {
        let event_info = get_event_info(organizer_addr, event_id);
        event_info.current_attendees
    }

    fun has_claimed_badge(user_addr: address, event_id: u64, badges: &vector<Badge>): bool {
        let i = 0;
        while (i < vector::length(badges)) {
            let badge = vector::borrow(badges, i);
            if (badge.attendee == user_addr && badge.event_id == event_id) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun num_to_string(num: u64): String {
        if (num == 0) {
            return string::utf8(b"0")
        };
        
        let digits = vector::empty<u8>();
        while (num > 0) {
            let digit = ((num % 10) as u8) + 48;
            vector::push_back(&mut digits, digit);
            num = num / 10;
        };
        
        vector::reverse(&mut digits);
        string::utf8(digits)
    }

    /// Create a sample RiseIn Web3 meetup event
    public entry fun create_sample_event(organizer: &signer) acquires RiseInPOAP {
        let now = timestamp::now_seconds();
        create_event(
            organizer,
            string::utf8(b"RiseIn Web3 Developer Meetup #1"),
            string::utf8(b"Join us for an exciting Web3 developer meetup featuring blockchain development, DeFi protocols, and NFT creation workshops."),
            now,
            now + 7200, // 2 hours
            string::utf8(b"RiseIn Community Hub, Bangalore"),
            100,
        );
    }
}
