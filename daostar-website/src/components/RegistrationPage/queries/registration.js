import { gql } from "@apollo/client";

const REGISTRATION = gql`
    query Registration($id: String) {
        registrationInstance(id: $id) {
            id
            daoAddress
            daoURI
            daoName
            daoDescription
            membersURI
            issuersURI
            proposalsURI
            governanceURI
            activityLogURI
            registrationAddress
            network
        }
    }
`

export default REGISTRATION;