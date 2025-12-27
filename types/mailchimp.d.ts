declare module '@mailchimp/mailchimp_marketing' {
  export interface Config {
    apiKey?: string;
    accessToken?: string;
    server?: string;
  }

  export interface ListMember {
    email_address: string;
    status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
    merge_fields?: Record<string, string>;
    tags?: string[];
  }

  export interface Lists {
    addListMember(listId: string, member: ListMember): Promise<any>;
    setListMember(listId: string, subscriberHash: string, member: Partial<ListMember>): Promise<any>;
    getListMember(listId: string, subscriberHash: string): Promise<any>;
    updateListMemberTags(listId: string, subscriberHash: string, body: { tags: Array<{ name: string; status: 'active' | 'inactive' }> }): Promise<any>;
  }

  export interface Mailchimp {
    setConfig(config: Config): void;
    lists: Lists;
  }

  const mailchimp: Mailchimp;
  export default mailchimp;
}
