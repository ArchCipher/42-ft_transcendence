**Product rules : (as agreed on the 16.09.26)**
- group or organization ==> same thing
- friends are basically a list of contacts, they is no collaboration intended within friends, only within groups.
- you can invite someone to become you friend : either with their email or if you know their unique username
- this friend request has to be accepted
- a user can have private documents
- a user can create a collab group by adding a set of his/her friends, no confirmation needed there
- a Group has : 
	- one single Owner => the only one that can delete the group and its content. AND decide who becomes an admin. The owner also has editor rights on every docs in the group.
	- Admin(s) => can add/delete members (within their own friend list)
	- Member(s), by default, are viewer of any document BUT, they can also create/edit/manage documents within the group
===> **second layer :**
- a Document has :
	- Editor(s) => can delete and grant access on that one document AND edit...
	- Viewer(s) (anyone in a group has at least viewer grants)
	

**Deletions :**
- when the owner deletes a group, all the documents of that group are deleted
- when a user is deleted or leave : 
	- private documents are deleted
	- any group with one person only (this one user == owner) is deleted (same as above actually)
	- for groups with more than one person if he/she is the owner => the group ownership has to be transferred (either automatically -> oldest admin -> oldest member OR explicitly with a UI window)


**Implementation**
- A doc is owned by a ~~space~~ group (either the privateSpace or a group) - rather than by a user.
- 4 predicats are needed : can_View, can_Edit (and manage), ~~canManageDoc,~~ canAdminGroup, canOwnGroup  (Note : the first on is just a fetch actually...)
- some refacto will be needed on our routes
- the privateSpace has to be created the creation of the user
- the last 2 deletion rules has to be implemented on the application side, the others are handled by Prisma directly. 


**UI needs for the dashboard (TBD)**
- everyone => can leave a group
- canEdit => can rename a doc
- canedit => delete or grant access to a doc.
- canAdminGroup => can add or revoke members
- canOwnGroup => can delete the group, can add or revoke admins
- Optional, if we prefer it explicit : transfer of the group ownership on account deletion of the current owner 



**OPTIONAL : platform admin**
If we want to claim 2 more points for the "Major: Advanced permissions system"  : 
- the added platform_admin can manage groups and users but can't access the content (document and their grants) of a group.
=> we would just need an extra admin_page for that. But all the needed machinery is already shared with the above...





