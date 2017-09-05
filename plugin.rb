# name: discourse-solved-unsolved-button
# about: Add solved and unsolved button to topic on Discourse
# version: 0.1
# authors: Muhlis Budi Cahyono (muhlisbc@gmail.com)
# url: http://git.dev.abylina.com/momon/discourse-solved-unsolved-button

register_asset 'stylesheets/mmn-solved-unsolved-button.scss'

after_initialize {

  # controller
  module ::MmnSolvedQueue
    class Engine < ::Rails::Engine
      engine_name 'mmn_solved_queue'
      isolate_namespace MmnSolvedQueue
    end
  end

  require_dependency "application_controller"
  class MmnSolvedQueue::SolvedController < ::ApplicationController

    def list
      state       = params["state"]
      topic_ids   = TopicCustomField.where(name: "solved_state", value: state).pluck(:topic_id)
      topics      = Topic.where(id: topic_ids).includes(:user).references(:user)
      render_json_dump(serialize_data(topics, TopicListItemSerializer, scope: guardian, root: false))
    end

    def set_state
      topic = Topic.find(params[:id].to_i)
      state = params["state"]

      if ["pending_solved", "pending_unsolved"].include?(state)
        guardian.ensure_mmn_solved_can_queue!(topic)
      elsif ["solved", "unsolved"].include?(state)
        guardian.ensure_mmn_solved_can_process!(topic)
      else
        guardian.ensure_mmn_solved_can_reset!(topic)
      end

      topic.custom_fields["solved_state"] = state
      topic.save!

      render json: {state: state}
    end

    def is_show_link
      render json: {show_link: current_user.groups.pluck(:name).include?(SiteSetting.solved_group_name_can_process)}
    end

  end

  MmnSolvedQueue::Engine.routes.draw do
    get "/list"           => "solved#list"
    post "/set_state"     => "solved#set_state"
    get "/is_show_link"   => "solved#is_show_link"
  end

  Discourse::Application.routes.append do
    mount ::MmnSolvedQueue::Engine, at: "mmn_solved_queue"
  end

  # guardian
  class ::Guardian

    def mmn_solved_can_queue?(topic)
      mmn_can_solve?(topic) && mmn_queue_crit(topic)
    end

    def mmn_solved_can_process?(topic)
      mmn_can_solve?(topic) && mmn_process_crit
    end

    def mmn_solved_can_reset?(topic)
      mmn_can_solve?(topic) && (mmn_process_crit || mmn_queue_crit(topic))
    end

    def mmn_can_solve?(topic)
      allow_accepted_answers_on_category?(topic.category_id) && authenticated?
    end

    def mmn_queue_crit(topic)
      !topic.closed? && (mmn_is_op?(topic.user_id) || mmn_group_member?(SiteSetting.solved_group_name_can_queue))
    end

    def mmn_process_crit
      mmn_group_member?(SiteSetting.solved_group_name_can_process)
    end

    def mmn_is_op?(topic_user_id)
      topic_user_id == current_user.id
    end

    def mmn_group_member?(group_name)
      @mmn_groups ||= current_user.groups.pluck(:name)
      @mmn_groups.include?(group_name)
    end

  end

  # serializers
  require_dependency 'topic_view_serializer'
  class ::TopicViewSerializer
    attributes :solved_state, :solved_can_queue, :solved_show_button

    def solved_state
      object.topic.custom_fields["solved_state"]
    end

    def solved_can_queue
      scope.mmn_solved_can_queue?(object.topic)
    end

    def solved_show_button
      !solved_state.nil? || scope.allow_accepted_answers_on_category?(object.topic.category_id)
    end
  end

  module ::MmnSolvedCustomHelper
    def self.included(base)
      base.class_eval {
        attributes :solved_state, :solved_can_process, :user

        def solved_state
          object.custom_fields["solved_state"]
        end

        def user
          object.user ? object.user.slice(:username, :id, :avatar_template, :name) : {}
        end

        def solved_can_process
          scope.mmn_solved_can_process?(object)
        end
      }
    end
  end

  require_dependency 'topic_list_item_serializer'
  require_dependency 'listable_topic_serializer'

  ::TopicListItemSerializer.send(:include, MmnSolvedCustomHelper)
  ::ListableTopicSerializer.send(:include, MmnSolvedCustomHelper)

  TopicList.preloaded_custom_fields << "solved_state" if TopicList.respond_to? :preloaded_custom_fields

  if CategoryList.respond_to?(:preloaded_topic_custom_fields)
    CategoryList.preloaded_topic_custom_fields << "solved_state"
  end

}