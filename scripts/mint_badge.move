script {
    use POAP::POAP;

    fun main(event_organizer: &signer, attendee: address) {
        POAP::mint_badge(event_organizer, attendee);
    }
}