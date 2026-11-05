`runa.p12` is the key the Runa app is signed with, so each new build installs over the last one on the phone.
It is locked with a long random password that is not in this repository: it lives only in the repository's
Actions secret `RUNA_SIGNING`, which the App workflow reads.
